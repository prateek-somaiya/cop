import { ICopRecommendations } from '.';
declare const xlsxUtil: {
    recommendationsToXlsx: (filepath: string, copRecommendations: ICopRecommendations) => void;
    instanceRecommendationsToXlsx: (filepath: string, recommendations: import("aws-sdk/clients/computeoptimizer").InstanceRecommendation[]) => void;
    volumeRecommendationsToXlsx: (filepath: string, recommendations: import("aws-sdk/clients/computeoptimizer").VolumeRecommendation[]) => void;
};
export default xlsxUtil;
