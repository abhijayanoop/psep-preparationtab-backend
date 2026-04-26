// src/routes/preparation.route.ts
import { Router } from "express";
import PreparationController from "@controllers/preparation.controller";
import { Routes } from "@interfaces/routes.interface";

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
      this.preparationController.generateRecommendations,
    );

    this.router.post(
      `${this.path}/:studentId/regenerate`,
      this.preparationController.regenerateRecommendations,
    );

    this.router.get(
      `${this.path}/:studentId/stale-check`,
      this.preparationController.checkStale,
    );
  }
}

export default PreparationRoute;
