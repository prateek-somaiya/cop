import xlsx from 'xlsx';

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

const findMaxMetric = (
  metrics: AWS.ComputeOptimizer.UtilizationMetric[] | undefined,
  metric: string,
): number | undefined =>
  metrics?.find(e => e.name?.toUpperCase() === metric.toUpperCase() && e.statistic?.toUpperCase() === 'MAXIMUM')?.value;

const findRecommendation = (
  recommendations: AWS.ComputeOptimizer.InstanceRecommendationOption[] | undefined,
  rank: number,
): AWS.ComputeOptimizer.InstanceRecommendationOption | undefined =>
  recommendations
    ? recommendations.sort((a, b) => (a.rank ? a.rank : 0) - (b.rank ? b.rank : 0))[rank - 1]
    : recommendations;

const xlsxUtil = {
  instanceRecommendationsToXlsx: (
    filepath: string,
    recommendations: AWS.ComputeOptimizer.InstanceRecommendation[],
  ): void => {
    const wb = xlsx.utils.book_new();
    const sheetName = 'instance-recommendations';
    wb.SheetNames.push(sheetName);
    wb.Sheets[sheetName] = xlsx.utils.aoa_to_sheet(
      [instanceRecommendationHeader].concat(
        <any[]>recommendations.map(e => [
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
            const recommendation = findRecommendation(e.recommendationOptions, rank);
            return [
              recommendation?.instanceType,
              findMaxMetric(recommendation?.projectedUtilizationMetrics, 'CPU'),
              findMaxMetric(recommendation?.projectedUtilizationMetrics, 'MEMORY'),
              recommendation?.performanceRisk,
            ];
          }),
        ]),
      ),
    );

    xlsx.writeFile(wb, filepath);
  },
};

export default xlsxUtil;
