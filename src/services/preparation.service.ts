import { HttpException } from "@/exceptions/HttpException";
import { StudentPreparationContext } from "@/interfaces/preparation.interface";
import IStudent from "@/interfaces/student.interface";
import studentModel from "@/models/student.model";
import {
  composeAcademicBackground,
  deriveReadinessLabel,
} from "@/utils/readinessUtil";
import GeminiService from "./gemini.service";
import {
  GeneratedRecommendation,
  PersistedRecommendation,
  PersistedRecommendationsArraySchema,
} from "@/schema/preparation.schema";
import {
  IContextSnapshot,
  IRecommendationSet,
} from "@/interfaces/recommendation-set.interface";
import recommendationSetModel from "@/models/recommendation-set.model";
import { injectRoleIds } from "@/utils/role-id";
import { logger } from "@/utils/logger";
import { hashPreparationContext } from "@/utils/context-hash";

class PreparationService {
  private geminiService = new GeminiService();

  public async getStudentPreparationContext(
    studentId: string,
  ): Promise<StudentPreparationContext> {
    if (!studentId) {
      throw new HttpException(400, "studentId is required");
    }
    const student = await studentModel.findById(studentId);

    if (!student) {
      throw new HttpException(404, "student not found");
    }

    // this.validateMinimumDataRequirements(student);

    return this.buildContext(student);
  }

  private validateMinimumDataRequirements(student: IStudent): void {
    const missing: string[] = [];

    if (student.marketIndex === undefined || student.marketIndex === null) {
      missing.push("marketIndex");
    }
    if (student.academicIndex === undefined || student.academicIndex === null) {
      missing.push("academicIndex");
    }
    if (
      student.knowledgeIndex === undefined ||
      student.knowledgeIndex === null
    ) {
      missing.push("knowledgeIndex");
    }
    if (!student.course && !student.degree) {
      missing.push("course/degree");
    }

    if (missing.length > 0) {
      throw new HttpException(
        422,
        `Student profile incomplete for preparation analysis. Missing: ${missing.join(
          ", ",
        )}`,
      );
    }
  }

  private buildContext(student: IStudent): StudentPreparationContext {
    const marketIndex = student.marketIndex ?? 0;

    return {
      studentId: String(student._id),
      studentName: student.studentName ?? "Unknown",

      course: student.course ?? "",
      degree: student.degree ?? "",
      specialization: student.specialization ?? "",
      academicBackground: composeAcademicBackground({
        degree: student.degree,
        course: student.course,
        specialization: student.specialization,
        branch: student.branch,
        major: student.major,
      }),

      marketIndex,
      academicIndex: student.academicIndex ?? 0,
      knowledgeIndex: student.knowledgeIndex ?? 0,
      skillIndex: student.skillIndex ?? 0,
      cgpa: student.cgpa ?? 0,

      readinessLabel: deriveReadinessLabel(marketIndex),
      readinessPercentage: marketIndex,

      acquiredSkills: student.acquiredSkills ?? [],
      unverifiedSkills: student.unverifiedSkills ?? [],

      careerIntent: {
        industry: student.careerData?.industry ?? "",
        role: student.careerData?.role ?? "",
      },

      currentSemester: student.currentSemester ?? student.semester ?? 0,
      generatedAt: new Date(),
    };
  }

  public async getRecommendationsForStudents(studentId: string): Promise<{
    context: StudentPreparationContext;
    recommendations: GeneratedRecommendation[];
  }> {
    const context = await this.getStudentPreparationContext(studentId);
    const recommendations =
      await this.geminiService.generateCareerRecommendations(context);

    return { context, recommendations };
  }

  public async generateInitialRecommendationSet(
    studentId: string,
  ): Promise<IRecommendationSet> {
    const existing = await recommendationSetModel.findOne({
      studentId,
      isActive: true,
    });

    if (existing) {
      throw new HttpException(
        409,
        "Student already has an active recommendation set. Use regenerate instead.",
      );
    }

    return this.buildAndPersistRecommendationSet(studentId, 1);
  }

  public async regenerateRecommendationSet(
    studentId: string,
  ): Promise<IRecommendationSet> {
    const existing = await recommendationSetModel.findOne({
      studentId: studentId,
      isActive: true,
    });

    if (existing) {
      await recommendationSetModel.updateOne(
        { _id: existing._id },
        { $set: { isActive: false } },
      );
      logger.info(
        `Archived recommendation set ${existing._id} for student ${studentId} (v${existing.generationVersion})`,
      );
    }

    const nextVersion = existing ? existing.generationVersion + 1 : 1;

    const newSet = await this.buildAndPersistRecommendationSet(
      studentId,
      nextVersion,
    );

    return newSet;
  }

  public async checkRecommendationStale(studentId: string): Promise<{
    hasActiveSet: boolean;
    isStale: boolean;
    generatedAt: Date | null;
    currentHash: string;
    storedHash: string | null;
  }> {
    const context = await this.getStudentPreparationContext(studentId);
    const currentHash = hashPreparationContext(context);
    const activeSet = await recommendationSetModel
      .findOne({
        studentId: studentId,
        isActive: true,
      })
      .lean();

    if (!activeSet) {
      return {
        hasActiveSet: false,
        isStale: false,
        generatedAt: null,
        currentHash: currentHash,
        storedHash: null,
      };
    }

    return {
      hasActiveSet: true,
      isStale: currentHash !== activeSet.contextHash,
      generatedAt: activeSet.generatedAt,
      currentHash: currentHash,
      storedHash: activeSet.contextHash,
    };
  }

  public async getActiveRecommendationSet(
    studentId: string,
  ): Promise<IRecommendationSet | null> {
    if (!studentId) {
      throw new HttpException(400, "Student Id required");
    }

    const set = await recommendationSetModel
      .findOne({ studentId: studentId, isActive: true })
      .lean();

    return set;
  }

  private async buildAndPersistRecommendationSet(
    studentId: string,
    generationVersion: number,
  ): Promise<IRecommendationSet> {
    const context = await this.getStudentPreparationContext(studentId);
    const generated = await this.geminiService.generateCareerRecommendations(
      context,
    );
    const persisted = injectRoleIds(generated);

    const validationResult =
      PersistedRecommendationsArraySchema.safeParse(persisted);
    if (!validationResult.success) {
      logger.error(
        `Persisted recommendations failed Zod validation: ${JSON.stringify(
          validationResult.error.issues,
        )}`,
      );
      throw new HttpException(
        500,
        "Internal error: generated recommendations failed schema validation after roleId injection",
      );
    }

    const contextSnapshot: IContextSnapshot = {
      marketIndex: context.marketIndex,
      academicIndex: context.academicIndex,
      knowledgeIndex: context.knowledgeIndex,
      skillIndex: context.skillIndex,
      acquiredSkills: context.acquiredSkills,
      readinessLabel: context.readinessLabel,
    };

    const contextHash = hashPreparationContext(context);

    const created = await recommendationSetModel.create({
      studentId,
      isActive: true,
      generationVersion,
      recommendations: validationResult.data,
      contextSnapshot,
      contextHash,
      generatedAt: new Date(),
    });

    logger.info(
      `Created recommendation set ${created._id} for student ${studentId} (v${generationVersion})`,
    );

    return created.toObject();
  }
}

export default PreparationService;
