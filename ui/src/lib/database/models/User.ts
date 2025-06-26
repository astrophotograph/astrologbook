import {DataTypes, Model, Optional} from 'sequelize'
import {sequelize} from '../connection'

export interface UserAttributes {
  // id: string;
  email?: string;
  name?: string;
  image?: string;
  metadata_?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  declare id: string;
  declare email?: string;
  declare name?: string;
  declare image?: string;
  declare metadata_?: Record<string, any>;
  declare created_at: Date;
  declare updated_at: Date;
}

User.init(
  {
    // @ts-ignore
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);
