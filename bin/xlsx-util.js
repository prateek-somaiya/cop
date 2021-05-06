"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const xlsx_1 = __importDefault(require("xlsx"));
const instanceRecommendationHeader = [
    'Account ID',
    'Region',
    'Instance Arn',
    'Instance Name',
    'Current Type',
    'Finding',
    'Max CPU',
    'Max Memory',
    'Max Read Ops',
    'Max Write Ops',
    'Max Read Bytes',
    'Max Write Bytes',
    'RA Instance Type',
    'RA Max CPU',
    'RA Max Memory',
    'RA Performance Risk',
    'RB Instance Type',
    'RB Max CPU',
    'RB Max Memory',
    'RB Performance Risk',
    'RC Instance Type',
    'RC Max CPU',
    'RC Max Memory',
    'RC Performance Risk',
];
const volumeRecommendationHeader = [
    'Account ID',
    'Region',
    'Volume Arn',
    'Finding',
    'Current Type',
    'Current Size (GB)',
    'Baseline IOPS',
    'Baseline Throughput (MB/s)',
    'Burst IOPS',
    'Burst Throughput (MB/s)',
    'Max Read IOPS',
    'Max Read MB/s',
    'Max Write IOPS',
    'Max Write MB/s',
    'RA Volume Type',
    'RA Volume Size (GB)',
    'RA Baseline IOPS',
    'RA Baseline Throughput (MB/s)',
    'RA Burst IOPS',
    'RA Burst Throughput (MB/s)',
    'RA Performance Risk',
    'RB Volume Type',
    'RB Volume Size (GB)',
    'RB Baseline IOPS',
    'RB Baseline Throughput (MB/s)',
    'RB Burst IOPS',
    'RB Burst Throughput (MB/s)',
    'RB Performance Risk',
    'RC Volume Type',
    'RC Volume Size (GB)',
    'RC Baseline IOPS',
    'RC Baseline Throughput (MB/s)',
    'RC Burst IOPS',
    'RC Burst Throughput (MB/s)',
    'RC Performance Risk',
];
const findMaxMetric = (metrics, metric) => metrics?.find(e => e.name?.toUpperCase() === metric.toUpperCase() && e.statistic?.toUpperCase() === 'MAXIMUM')?.value;
const findInstanceRecommendation = (recommendations, rank) => recommendations
    ? recommendations.sort((a, b) => (a.rank ? a.rank : 0) - (b.rank ? b.rank : 0))[rank - 1]
    : recommendations;
const findVolumeRecommendation = (recommendations, rank) => recommendations
    ? recommendations.sort((a, b) => (a.rank ? a.rank : 0) - (b.rank ? b.rank : 0))[rank - 1]
    : recommendations;
const instanceRecommendationToAoa = (recommendations) => [instanceRecommendationHeader].concat(recommendations.map(e => [
    e.accountId,
    e.instanceArn?.split(':')[3],
    e.instanceArn,
    e.instanceName,
    e.currentInstanceType,
    e.finding,
    findMaxMetric(e.utilizationMetrics, 'CPU'),
    findMaxMetric(e.utilizationMetrics, 'MEMORY'),
    findMaxMetric(e.utilizationMetrics, 'EBS_READ_OPS_PER_SECOND'),
    findMaxMetric(e.utilizationMetrics, 'EBS_WRITE_OPS_PER_SECOND'),
    findMaxMetric(e.utilizationMetrics, 'EBS_READ_BYTES_PER_SECOND'),
    findMaxMetric(e.utilizationMetrics, 'EBS_WRITE_BYTES_PER_SECOND'),
    ...[1, 2, 3].flatMap(rank => {
        const recommendation = findInstanceRecommendation(e.recommendationOptions, rank);
        return [
            recommendation?.instanceType,
            findMaxMetric(recommendation?.projectedUtilizationMetrics, 'CPU'),
            findMaxMetric(recommendation?.projectedUtilizationMetrics, 'MEMORY'),
            recommendation?.performanceRisk,
        ];
    }),
]));
const volumeRecommendationToAoa = (recommendations) => [volumeRecommendationHeader].concat(recommendations.map(e => {
    const volumeReadOpsPerSecond = findMaxMetric(e.utilizationMetrics, 'VolumeReadOpsPerSecond');
    const volumeReadBytesPerSecond = findMaxMetric(e.utilizationMetrics, 'VolumeReadBytesPerSecond');
    const volumeWriteOpsPerSecond = findMaxMetric(e.utilizationMetrics, 'VolumeWriteOpsPerSecond');
    const volumeWriteBytesPerSecond = findMaxMetric(e.utilizationMetrics, 'VolumeWriteBytesPerSecond');
    return [
        e.accountId,
        e.volumeArn?.split(':')[3],
        e.volumeArn,
        e.finding,
        e.currentConfiguration?.volumeType,
        e.currentConfiguration?.volumeSize,
        e.currentConfiguration?.volumeBaselineIOPS,
        e.currentConfiguration?.volumeBaselineThroughput,
        e.currentConfiguration?.volumeBurstIOPS,
        e.currentConfiguration?.volumeBurstThroughput,
        volumeReadOpsPerSecond,
        volumeReadBytesPerSecond ? volumeReadBytesPerSecond / 1024 / 2014 : volumeReadBytesPerSecond,
        volumeWriteOpsPerSecond,
        volumeWriteBytesPerSecond ? volumeWriteBytesPerSecond / 1024 / 1024 : volumeWriteBytesPerSecond,
        ...[1, 2, 3].flatMap(rank => {
            const recommendation = findVolumeRecommendation(e.volumeRecommendationOptions, rank);
            return [
                recommendation?.configuration?.volumeType,
                recommendation?.configuration?.volumeSize,
                recommendation?.configuration?.volumeBaselineIOPS,
                recommendation?.configuration?.volumeBaselineThroughput,
                recommendation?.configuration?.volumeBurstIOPS,
                recommendation?.configuration?.volumeBurstThroughput,
                recommendation?.performanceRisk,
            ];
        }),
    ];
}));
const xlsxUtil = {
    recommendationsToXlsx: (filepath, copRecommendations) => {
        const wb = xlsx_1.default.utils.book_new();
        if (copRecommendations.iRecommendations) {
            const sheetName = 'instance-recommendations';
            wb.SheetNames.push(sheetName);
            wb.Sheets[sheetName] = xlsx_1.default.utils.aoa_to_sheet(instanceRecommendationToAoa(copRecommendations.iRecommendations));
        }
        if (copRecommendations.vRecommendations) {
            const sheetName = 'volume-recommendations';
            wb.SheetNames.push(sheetName);
            wb.Sheets[sheetName] = xlsx_1.default.utils.aoa_to_sheet(volumeRecommendationToAoa(copRecommendations.vRecommendations));
        }
        xlsx_1.default.writeFile(wb, filepath);
    },
    instanceRecommendationsToXlsx: (filepath, recommendations) => {
        const wb = xlsx_1.default.utils.book_new();
        const sheetName = 'instance-recommendations';
        wb.SheetNames.push(sheetName);
        wb.Sheets[sheetName] = xlsx_1.default.utils.aoa_to_sheet(instanceRecommendationToAoa(recommendations));
        xlsx_1.default.writeFile(wb, filepath);
    },
    volumeRecommendationsToXlsx: (filepath, recommendations) => {
        const wb = xlsx_1.default.utils.book_new();
        const sheetName = 'volume-recommendations';
        wb.SheetNames.push(sheetName);
        wb.Sheets[sheetName] = xlsx_1.default.utils.aoa_to_sheet(volumeRecommendationToAoa(recommendations));
        xlsx_1.default.writeFile(wb, filepath);
    },
};
exports.default = xlsxUtil;
