import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index';
import { User } from './User';
import { Collection } from './Collection';

export interface ImageAttributes {
  id: string;
  user_id: string;
  filename: string;
  url?: string;
  metadata_?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface ImageCreationAttributes
  extends Optional<ImageAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Image extends Model<ImageAttributes, ImageCreationAttributes>
  implements ImageAttributes {
  public id!: string;
  public user_id!: string;
  public filename!: string;
  public url?: string;
  public metadata_?: Record<string, any>;
  public created_at!: Date;
  public updated_at!: Date;
}

Image.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata_: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const value = this.getDataValue('metadata_');
        return value ? JSON.parse(value) : null;
      },
      set(value: any) {
        this.setDataValue('metadata_', value ? JSON.stringify(value) : null);
      },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'Image',
    tableName: 'image',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['filename'],
      },
    ],
  }
);

// Define associations
User.hasMany(Image, { foreignKey: 'user_id', as: 'images' });
Image.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Many-to-many relationship with Collections
Image.belongsToMany(Collection, {
  through: 'collectionimage',
  foreignKey: 'image_id',
  otherKey: 'collection_id',
  as: 'collections',
});

Collection.belongsToMany(Image, {
  through: 'collectionimage',
  foreignKey: 'collection_id',
  otherKey: 'image_id',
  as: 'images',
});
