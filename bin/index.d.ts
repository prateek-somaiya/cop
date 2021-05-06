#!/usr/bin/env node
export interface ICopRecommendations {
    iRecommendations?: AWS.ComputeOptimizer.InstanceRecommendation[];
    vRecommendations?: AWS.ComputeOptimizer.VolumeRecommendation[];
}
