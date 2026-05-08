// src/routes/preparation.route.ts
import { Router } from "express";
import PreparationController from "@controllers/preparation.controller";
import { Routes } from "@interfaces/routes.interface";
import {
  geminiRateLimiter,
  submissionRateLimiter,
} from "@middlewares/rate-limit.middleware";

class PreparationRoute implements Routes {
  public path = "/preparation";
  public router = Router();
  public preparationController = new PreparationController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(
      `${this.path}/:studentId/context`,
      this.preparationController.getPreparationContext,
    );

    this.router.get(
      `${this.path}/:studentId`,
      this.preparationController.getActiveSet,
    );

    this.router.post(
      `${this.path}/:studentId/generate`,
      geminiRateLimiter,
      this.preparationController.generateRecommendations,
    );

    this.router.post(
      `${this.path}/:studentId/regenerate`,
      geminiRateLimiter,
      this.preparationController.regenerateRecommendations,
    );

    this.router.get(
      `${this.path}/:studentId/stale-check`,
      this.preparationController.checkStale,
    );

    this.router.patch(
      `${this.path}/:studentId/recommendations/:roleId/milestones/:milestoneNumber/progress`,
      this.preparationController.updateMilestoneProgress,
    );

    this.router.post(
      `${this.path}/:studentId/recommendations/:roleId/milestones/:milestoneNumber/submit`,
      submissionRateLimiter,
      this.preparationController.submitMilestone,
    );

    this.router.get(
      `${this.path}/:studentId/recommendations/:roleId/milestones/:milestoneNumber/submissions`,
      this.preparationController.getMilestoneHistory,
    );
  }
}

export default PreparationRoute;
