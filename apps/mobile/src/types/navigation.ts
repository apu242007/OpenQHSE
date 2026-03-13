/**
 * Route parameter definitions for expo-router typed routes.
 */

export type RootParamList = {
  '(tabs)': undefined;
  login: undefined;
  'form/[id]': { id: string };
  'incident/report': undefined;
  'permit/scan': undefined;
  'equipment/scan': undefined;
};

export type TabParamList = {
  home: undefined;
  forms: undefined;
  incidents: undefined;
  actions: undefined;
  more: undefined;
};
