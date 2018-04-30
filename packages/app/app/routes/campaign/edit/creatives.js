import Route from '@ember/routing/route';
import RouteQueryManager from "ember-apollo-client/mixins/route-query-manager";

import query from 'fortnight/gql/queries/campaign/creatives';

export default Route.extend(RouteQueryManager, {
  model() {
    const { id } = this.modelFor('campaign.edit');
    const variables = { input: { id } };
    return this.get('apollo').watchQuery({ query, variables, refetchPolicy: 'network-only' }, 'campaign');
  },
});
