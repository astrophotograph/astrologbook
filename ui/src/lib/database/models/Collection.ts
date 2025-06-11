import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index';
import { User } from './User';

export interface CollectionAttributes {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  template?: string;
  metadata_?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CollectionCreationAttributes 
  extends Optional<CollectionAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class Collection extends Model<CollectionAttributes, CollectionCreationAttributes> 
  implements CollectionAttributes {
  public id!: string;
  public user_id!: string;
  public name!: string;
  public description?: string;
  public visibility!: 'public' | 'private';
  public template?: string;
  public metadata_?: Record<string, any>;
  public created_at!: Date;
  public updated_at!: Date;
}

Collection.init(
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
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    visibility: {
      type: DataTypes.ENUM('public', 'private'),
      allowNull: false,
      defaultValue: 'public',
    },
    template: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata_: {
      type: DataTypes.JSONB,
      allowNull: true,
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
    modelName: 'Collection',
    tableName: 'collection',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id'],
      },
      {
        fields: ['visibility'],
      },
      {
        fields: ['template'],
      },
    ],
  }
);

// Define associations
User.hasMany(Collection, { foreignKey: 'user_id', as: 'collections' });
Collection.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
