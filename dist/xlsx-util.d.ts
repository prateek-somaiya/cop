declare const xlsxUtil: {
    instanceRecommendationsToXlsx: (filepath: string, recommendations: import("aws-sdk/clients/computeoptimizer").InstanceRecommendation[]) => void;
};
export default xlsxUtil;
