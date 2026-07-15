/**
 * System: Pedestrian Hazard YOLO
 * Module: Simulation Home Route
 * File URL: frontend/src/routes/index.tsx
 * Purpose: Render the video hazard simulator as the application home page
 */
import { createFileRoute } from "@tanstack/react-router";
import { VideoSimulator } from "../components/VideoSimulator";

export const Route = createFileRoute("/")({ component: VideoSimulator });
