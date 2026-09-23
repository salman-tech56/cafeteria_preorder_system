class QueryBuilder {
  constructor(executor) {
    this._executor = executor;
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._populate = [];
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(n) {
    this._limit = n;
    return this;
  }

  skip(n) {
    this._skip = n;
    return this;
  }

  populate(p) {
    this._populate.push(p);
    return this;
  }

  select(s) {
    return this;
  }

  lean() {
    return this;
  }

  async then(resolve, reject) {
    try {
      const res = await this._executor({
        sort: this._sort,
        limit: this._limit,
        skip: this._skip,
        populate: this._populate,
      });
      resolve(res);
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }

  async catch(reject) {
    try {
      return await this.then((res) => res);
    } catch (err) {
      return reject(err);
    }
  }
}

module.exports = QueryBuilder;
