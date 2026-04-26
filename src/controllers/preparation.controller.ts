import PreparationService from "@/services/preparation.service";
import type { Request, Response, NextFunction } from "express";

class PreparationController {
  public preparationService = new PreparationService();
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
}

export default PreparationController;
