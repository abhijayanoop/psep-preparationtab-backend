import PreparationService from "@/services/preparation.service";
import { HttpException } from "@/exceptions/HttpException";
import { MilestoneProgressSchema } from "@/schema/preparation.schema";
import MilestoneEvaluationService from "@/services/milestone-evaluation.service";
import type { Request, Response, NextFunction } from "express";

class PreparationController {
  public preparationService = new PreparationService();
  public evaluationService = new MilestoneEvaluationService();
  public getPreparationContext = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;
      const context =
        await this.preparationService.getStudentPreparationContext(studentId);
      res.status(200).json({
        data: context,
        message: "preparation context built",
      });
    } catch (error) {
      next(error);
    }
  };

  public getRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;

      const response =
        await this.preparationService.getRecommendationsForStudents(studentId);

      res
        .status(200)
        .json({ message: "Recommendations generated successfully", response });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /preparation/:studentId
   */
  public getActiveSet = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;
      const set = await this.preparationService.getActiveRecommendationSet(
        studentId,
      );

      if (!set) {
        res.status(200).json({
          data: { hasRecommendations: false },
        });
        return;
      }

      res.status(200).json({
        data: { hasRecommendations: true, set },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /preparation/:studentId/generate
   */
  public generateRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;
      const set =
        await this.preparationService.generateInitialRecommendationSet(
          studentId,
        );

      res.status(201).json({
        data: set,
        message: "preparation generated",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /preparation/:studentId/regenerate
   */
  public regenerateRecommendations = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;
      const set = await this.preparationService.regenerateRecommendationSet(
        studentId,
      );

      res.status(201).json({
        data: set,
        message: "preparation regenerated",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PATCH /preparation/:studentId/recommendations/:roleId/milestones/:milestoneNumber/progress
   */
  public updateMilestoneProgress = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { studentId, roleId } = req.params;
      const milestoneNumber = Number(req.params.milestoneNumber);
      const { progress } = req.body;

      if (isNaN(milestoneNumber) || milestoneNumber < 1) {
        throw new HttpException(
          400,
          "milestoneNumber must be a positive integer",
        );
      }

      const parsed = MilestoneProgressSchema.safeParse(progress);
      if (!parsed.success) {
        throw new HttpException(
          400,
          "progress must be one of: not_started, in_progress, completed",
        );
      }

      await this.preparationService.updateMilestoneProgress(
        studentId,
        roleId,
        milestoneNumber,
        parsed.data,
      );

      res.status(200).json({ message: "Milestone progress updated" });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /preparation/:studentId/stale-check
   */
  public checkStale = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const studentId = req.params.studentId;
      const result = await this.preparationService.checkRecommendationStale(
        studentId,
      );

      res.status(200).json({
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /preparation/:studentId/recommendations/:roleId/milestones/:milestoneNumber/submit
   */
  public submitMilestone = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { studentId, roleId } = req.params;
      const milestoneNumber = Number(req.params.milestoneNumber);
      const { submissionUrl } = req.body;

      if (isNaN(milestoneNumber) || milestoneNumber < 1) {
        throw new HttpException(
          400,
          "milestoneNumber must be a positive integer",
        );
      }

      if (!submissionUrl || typeof submissionUrl !== "string") {
        throw new HttpException(400, "submissionUrl is required");
      }

      if (!submissionUrl.includes("github.com")) {
        throw new HttpException(
          400,
          "Only GitHub repository URLs are accepted (github.com)",
        );
      }

      const result = await this.evaluationService.submitForEvaluation(
        studentId,
        roleId,
        milestoneNumber,
        submissionUrl,
      );

      res.status(200).json({
        data: {
          attempt: result.attempt,
          milestoneCompleted: result.progressUpdated,
        },
        message: result.progressUpdated
          ? "Milestone passed! Great work."
          : "Submission evaluated. See feedback for improvement areas.",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /preparation/:studentId/recommendations/:roleId/milestones/:milestoneNumber/submissions
   */
  public getMilestoneHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const { studentId, roleId } = req.params;
      const milestoneNumber = Number(req.params.milestoneNumber);

      if (isNaN(milestoneNumber) || milestoneNumber < 1) {
        throw new HttpException(
          400,
          "milestoneNumber must be a positive integer",
        );
      }

      const history = await this.evaluationService.getSubmissionHistory(
        studentId,
        roleId,
        milestoneNumber,
      );

      res.status(200).json({ data: history });
    } catch (error) {
      next(error);
    }
  };
}

export default PreparationController;
