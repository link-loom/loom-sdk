class SearchUtil {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;

    /* Custom Properties */

    /* Assigments */
    this._namespace = '[Loom]::[Utils]::[Search]';
  }

  /// Find an object dynamically by dot style
  /// E.g.
  /// var objExample = {employee: { firstname: "camilo", job:{name:"developer"}}}
  /// searchDotStyle(objExample, 'employee.job.name')
  #searchDotStyle(obj, query) {
    return query.split('.').reduce((key, val) => key[val], obj);
  }

  // Search an object in a simple array
  #findObject(query, _array) {
    return _array.find(function (element) {
      return element === query;
    });
  }

  // Search an item by an object key
  #findObjectByKey(query, key, _array) {
    return _array.find(function (element) {
      return element[key] === query;
    });
  }

  #findDeepObjectByKey(query, key, _array) {
    return _array.find(function (element) {
      const deepObject = this.searchDotStyle(element, key);
      return deepObject === query;
    });
  }

  // Return index otherwise -1 is returned
  #findIndexByKey(query, key, _array) {
    return _array.findIndex(function (element) {
      return element[key] === query;
    });
  }

  // Return index otherwise -1 is returned
  #findIndex(query, _array) {
    return _array.findIndex(function (element) {
      return element === query;
    });
  }

  #findAndRemove(query, _array) {
    const index = _array.findIndex(function (element) {
      return element === query;
    });

    if (index > -1) {
      _array.splice(index, 1);
    }
    return index;
  }

  #findAndRemoveByKey(query, key, _array) {
    const index = _array.findIndex(function (element) {
      return element[key] === query;
    });

    if (index > -1) {
      _array.splice(index, 1);
    }
    return index;
  }

  get search() {
    return {
      object: {
        searchDotStyle: this.#searchDotStyle.bind(this),
        findAndRemove: this.#findAndRemoveByKey.bind(this),
        findIndex: this.#findIndexByKey.bind(this),
        findObject: this.#findObjectByKey.bind(this),
        findDeepObject: this.#findDeepObjectByKey.bind(this),
      },
      array: {
        findAndRemove: this.#findAndRemove.bind(this),
        findIndex: this.#findIndex.bind(this),
        findObject: this.#findObject.bind(this),
      },
    };
  }
}

module.exports = SearchUtil;
