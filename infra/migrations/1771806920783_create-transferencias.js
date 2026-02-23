/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.createTable("transferencias", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        origem_id: {
            type: "text",
            notNull: true,
            references: '"insumos"',
            onDelete: "RESTRICT",
        },
        destino_id: {
            type: "text",
            notNull: true,
            references: '"insumos"',
            onDelete: "RESTRICT",
        },
        quantidade_kg: { type: "numeric(10,3)", notNull: true },
        custo_unitario: { type: "numeric(15,4)", notNull: true },
        data_transferencia: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        obs: { type: "text" },
    });
};

exports.down = (pgm) => {
    pgm.dropTable("transferencias");
};
