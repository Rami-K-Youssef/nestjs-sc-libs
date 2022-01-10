import mongoose, { SaveOptions, Schema } from "mongoose";

export const mongooseSoftDeletePlugin = (schema: Schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  const typesFindQueryMiddleware = [
    "count",
    "find",
    "findOne",
    "findOneAndDelete",
    "findOneAndRemove",
    "findOneAndUpdate",
    "update",
    "updateOne",
    "updateMany",
    "count",
    "countDocuments",
  ];

  async function excludeInFindQueriesIsDeleted(
    this: mongoose.Query<any, any>,
    next
  ) {
    if (this.getFilter().isDeleted == true) return next();

    this.setQuery({ ...this.getFilter(), isDeleted: false });
    next();
  }

  async function excludeInDeletedInAggregateMiddleware(
    this: mongoose.Aggregate<any>,
    next
  ) {
    this.pipeline().unshift({ $match: { isDeleted: false } });
    next();
  }

  typesFindQueryMiddleware.forEach((type) => {
    schema.pre(type, excludeInFindQueriesIsDeleted);
  });

  schema.static("softDelete", async function (filter, options?: SaveOptions) {
    const templates = await this.find(filter);
    if (!templates) {
      return Error("Element not found");
    }
    let deleted = 0;
    for (const template of templates) {
      if (!template.isDeleted) {
        template.$isDeleted(true);
        template.isDeleted = true;
        template.deletedAt = new Date();
        await template
          .save(options)
          .then(() => deleted++)
          .catch((e: mongoose.Error) => {
            throw new Error(e.name + " " + e.message);
          });
      }
    }
    return { deleted };
  });

  schema.static("restore", async function (filter) {
    // add {isDeleted: true} because the method find is set to filter the non deleted documents only,
    // so if we don't add {isDeleted: true}, it won't be able to find it
    const updatedQuery = {
      ...filter,
      isDeleted: true,
    };
    const deletedTemplates = await this.find(updatedQuery);
    if (!deletedTemplates) {
      return Error("element not found");
    }
    let restored = 0;
    for (const deletedTemplate of deletedTemplates) {
      if (deletedTemplate.isDeleted) {
        deletedTemplate.$isDeleted(false);
        deletedTemplate.isDeleted = false;
        deletedTemplate.deletedAt = null;
        await deletedTemplate
          .save()
          .then(() => restored++)
          .catch((e: mongoose.Error) => {
            throw new Error(e.name + " " + e.message);
          });
      }
    }
    return { restored };
  });

  schema.pre("aggregate", excludeInDeletedInAggregateMiddleware);
};
