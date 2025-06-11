import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../index';

export interface AstroObjectAttributes {
  id: string;
  name: string;
  display_name: string;
  otype?: string;
  seq?: number;
  metadata_?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface AstroObjectCreationAttributes 
  extends Optional<AstroObjectAttributes, 'id' | 'created_at' | 'updated_at'> {}

export class AstroObject extends Model<AstroObjectAttributes, AstroObjectCreationAttributes> 
  implements AstroObjectAttributes {
  public id!: string;
  public name!: string;
  public display_name!: string;
  public otype?: string;
  public seq?: number;
  public metadata_?: Record<string, any>;
  public created_at!: Date;
  public updated_at!: Date;
}

AstroObject.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    display_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otype: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    seq: {
      type: DataTypes.INTEGER,
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
    modelName: 'AstroObject',
    tableName: 'object',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['name'],
      },
      {
        fields: ['otype'],
      },
      {
        fields: ['seq'],
      },
    ],
  }
);
