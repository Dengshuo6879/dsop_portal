import { createSelector } from 'reselect';
import { sorters } from '@/utils/utils';
import { fromJS, Set, Map, OrderedMap, List } from 'immutable';
const DEFAULT_TAG = 'default';

const OPERATION_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];

const state = (state) => {
  return state || Map();
};

export const lastError = createSelector(state, (spec) => spec.get('lastError'));

export const url = createSelector(state, (spec) => spec.get('url'));

export const specStr = createSelector(state, (spec) => spec.get('spec') || '');

export const specSource = createSelector(state, (spec) => spec.get('specSource') || 'not-editor');

export const specJson = createSelector(state, (spec) => spec.get('json', Map()));

export const specResolved = createSelector(state, (spec) => spec.get('resolved', Map()));

export const specResolvedSubtree = (state, path) => {
  return state.getIn(['resolvedSubtrees', ...path], undefined);
};

const mergerFn = (oldVal, newVal) => {
  if (Map.isMap(oldVal) && Map.isMap(newVal)) {
    if (newVal.get('$$ref')) {
      // resolver artifacts indicated that this key was directly resolved
      // so we should drop the old value entirely
      return newVal;
    }

    return OrderedMap().mergeWith(mergerFn, oldVal, newVal);
  }

  return newVal;
};

export const specJsonWithResolvedSubtrees = createSelector(state, (spec) =>
  OrderedMap().mergeWith(mergerFn, spec.get('json'), spec.get('resolvedSubtrees')),
);

// Default Spec ( as an object )
export const spec = (state) => {
  let res = specJson(state);
  return res;
};

export const isOAS3 = createSelector(
  // isOAS3 is stubbed out here to work around an issue with injecting more selectors
  // in the OAS3 plugin, and to ensure that the function is always available.
  // It's not perfect, but our hybrid (core+plugin code) implementation for OAS3
  // needs this. //KS
  spec,
  () => false,
);

export const info = createSelector(spec, (spec) => returnSelfOrNewMap(spec && spec.get('info')));

export const externalDocs = createSelector(spec, (spec) =>
  returnSelfOrNewMap(spec && spec.get('externalDocs')),
);

export const version = createSelector(info, (info) => info && info.get('version'));

export const semver = createSelector(version, (version) =>
  /v?([0-9]*)\.([0-9]*)\.([0-9]*)/i.exec(version).slice(1),
);

export const paths = createSelector(specJsonWithResolvedSubtrees, (spec) => spec.get('paths'));

export const operations = createSelector(paths, (paths) => {
  if (!paths || paths.size < 1) return List();

  let list = List();

  if (!paths || !paths.forEach) {
    return List();
  }

  paths.forEach((path, pathName) => {
    if (!path || !path.forEach) {
      return {};
    }
    path.forEach((operation, method) => {
      if (OPERATION_METHODS.indexOf(method) < 0) {
        return;
      }
      list = list.push(
        fromJS({
          path: pathName,
          method,
          operation,
          id: `${method}-${pathName}`,
        }),
      );
    });
  });

  return list;
});

export const consumes = createSelector(spec, (spec) => Set(spec.get('consumes')));

export const produces = createSelector(spec, (spec) => Set(spec.get('produces')));

export const security = createSelector(spec, (spec) => spec.get('security', List()));

export const securityDefinitions = createSelector(spec, (spec) => spec.get('securityDefinitions'));

export const findDefinition = (state, name) => {
  const resolvedRes = state.getIn(['resolvedSubtrees', 'definitions', name], null);
  const unresolvedRes = state.getIn(['json', 'definitions', name], null);
  return resolvedRes || unresolvedRes || null;
};

export const definitions = createSelector(spec, (spec) => {
  const res = spec.get('definitions');
  return Map.isMap(res) ? res : Map();
});

export const basePath = createSelector(spec, (spec) => spec.get('basePath'));

export const host = createSelector(spec, (spec) => spec.get('host'));

export const schemes = createSelector(spec, (spec) => spec.get('schemes', Map()));

export const operationsWithRootInherited = createSelector(
  operations,
  consumes,
  produces,
  (operations, consumes, produces) => {
    return operations.map((ops) =>
      ops.update('operation', (op) => {
        if (op) {
          if (!Map.isMap(op)) {
            return;
          }
          return op.withMutations((op) => {
            if (!op.get('consumes')) {
              op.update('consumes', (a) => Set(a).merge(consumes));
            }
            if (!op.get('produces')) {
              op.update('produces', (a) => Set(a).merge(produces));
            }
            return op;
          });
        } else {
          // return something with Immutable methods
          return Map();
        }
      }),
    );
  },
);

export const tags = createSelector(spec, (json) => {
  const tags = json.get('tags', List());
  return List.isList(tags) ? tags.filter((tag) => Map.isMap(tag)) : List();
});

export const tagDetails = (state, tag) => {
  let currentTags = tags(state) || List();
  return currentTags.filter(Map.isMap).find((t) => t.get('name') === tag, Map());
};

export const operationsWithTags = createSelector(
  operationsWithRootInherited,
  tags,
  (operations, tags) => {
    return operations.reduce(
      (taggedMap, op) => {
        let tags = Set(op.getIn(['operation', 'tags']));
        if (tags.count() < 1) return taggedMap.update(DEFAULT_TAG, List(), (ar) => ar.push(op));
        return tags.reduce((res, tag) => res.update(tag, List(), (ar) => ar.push(op)), taggedMap);
      },
      tags.reduce((taggedMap, tag) => {
        return taggedMap.set(tag.get('name'), List());
      }, OrderedMap()),
    );
  },
);

export const taggedOperations = (state) => (getConfigs) => {
  const { tagsSorter, operationsSorter } = getConfigs;
  const _state = fromJS(state);
  const operationsWithTagsObj = operationsWithTags(_state)
    .sortBy(
      (val, key) => key, // get the name of the tag to be passed to the sorter
      (tagA, tagB) => {
        let sortFn = typeof tagsSorter === 'function' ? tagsSorter : sorters.tagsSorter[tagsSorter];
        return !sortFn ? null : sortFn(tagA, tagB);
      },
    )
    .map((ops, tag) => {
      let sortFn = sorters.operationsSorter[operationsSorter];
      let operations = !sortFn ? ops : ops.sort(sortFn);

      return Map({ tagDetails: tagDetails(_state, tag), operations: operations });
    })
    .toJS();

  console.log('operationsWithTagsObj--', operationsWithTagsObj);
  return operationsWithTagsObj;
};
