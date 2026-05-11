import type { Viewpoint, ViewpointId } from '../types';

export const BDD_VIEWPOINT_ID: ViewpointId = 'bdd';

export const bddViewpoint: Viewpoint = {
  id: BDD_VIEWPOINT_ID,
  label: 'Block Definition Diagram',
  acceptedElementKinds: ['PartDefinition'],
  acceptedEdgeKinds: ['Composition', 'Generalization'],
  defaultLayout: 'dagre',
  paletteItems: [],
  renderNode() {
    return null;
  },
  renderEdge() {
    return null;
  },
};
