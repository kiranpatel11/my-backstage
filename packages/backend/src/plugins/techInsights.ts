import {
    createRouter,
    buildTechInsightsContext,
    createFactRetrieverRegistration,
    entityOwnershipFactRetriever,
    entityMetadataFactRetriever,
    techdocsFactRetriever,
  } from '@backstage/plugin-tech-insights-backend';
  import { Router } from 'express';
  import { PluginEnvironment } from '../types';
  import {
    JsonRulesEngineFactCheckerFactory,
    JSON_RULE_ENGINE_CHECK_TYPE,
  } from '@backstage/plugin-tech-insights-backend-module-jsonfc';

  export default async function createPlugin({
    logger,
    config,
    discovery,
    database,
  }: PluginEnvironment): Promise<Router> {
    const builder = buildTechInsightsContext({
      logger,
      config,
      database,
      discovery,
      factRetrievers: [
        createFactRetrieverRegistration(
          '* * * * *', // Example cron, every minute
          entityOwnershipFactRetriever,
        ),
        createFactRetrieverRegistration('* * * * *', entityMetadataFactRetriever),
        createFactRetrieverRegistration('* * * * *', techdocsFactRetriever),
      ],
      factCheckerFactory: new JsonRulesEngineFactCheckerFactory({
        checks: [
          {
            id: 'catalogYAMLChecks',
            type: JSON_RULE_ENGINE_CHECK_TYPE,
            name: 'Catalog-Info YAML Checks',
            description: 'YAML data quality checks',
            factIds: [
              'entityMetadataFactRetriever',
              'techdocsFactRetriever',
              'entityOwnershipFactRetriever',
            ],
            rule: {
              conditions: {
                all: [
                  {
                    fact: 'hasGroupOwner',
                    operator: 'equal',
                    value: true,
                  },
                  {
                    fact: 'hasDescription',
                    operator: 'equal',
                    value: true,
                  },
                ],
              },
            },
          },
        ],
        logger,
      }),
    });

    return await createRouter({
      ...(await builder),
      logger,
      config,
    });
  }
