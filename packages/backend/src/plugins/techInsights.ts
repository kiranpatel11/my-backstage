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
        createFactRetrieverRegistration({
          cadence : '* * * * *', // Example cron, every minute
          factRetriever: entityOwnershipFactRetriever,
        }),
        createFactRetrieverRegistration({cadence : '* * * * *', factRetriever: entityMetadataFactRetriever}),
        createFactRetrieverRegistration({cadence: '* * * * *', factRetriever: techdocsFactRetriever}),
      ],
      factCheckerFactory: new JsonRulesEngineFactCheckerFactory({
        checks: [
          {
            id: 'ServiceOwnership',
            type: JSON_RULE_ENGINE_CHECK_TYPE,
            name: 'Has owner',
            description: 'This component has ownership defined in the catalog-info.yaml',
            factIds: [
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
                ],
              },
            },
          },
          {
            id: 'ServiceTitle',
            type: JSON_RULE_ENGINE_CHECK_TYPE,
            name: 'Has title',
            description: 'This component has title defined in the catalog-info.yaml',
            factIds: [
              'entityMetadataFactRetriever',
            ],
            rule: {
              conditions: {
                all: [
                  {
                    fact: 'hasTitle',
                    operator: 'equal',
                    value: true,
                  },
                ],
              },
            },
          },
          {
            id: 'ServiceDescription',
            type: JSON_RULE_ENGINE_CHECK_TYPE,
            name: 'Has description',
            description: 'This component has description in the catalog-info.yaml',
            factIds: [
              'entityMetadataFactRetriever',
            ],
            rule: {
              conditions: {
                all: [
                  {
                    fact: 'hasDescription',
                    operator: 'equal',
                    value: true,
                  },
                ],
              },
            },
          },
          {
            id: 'ServiceUsingTechDocs',
            type: JSON_RULE_ENGINE_CHECK_TYPE,
            name: 'Uses techdocs',
            description: 'This component has `backstage.io/techdocs-ref` annotation defined in the catalog-info.yaml',
            factIds: [
              'techdocsFactRetriever',
            ],
            rule: {
              conditions: {
                all: [
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
