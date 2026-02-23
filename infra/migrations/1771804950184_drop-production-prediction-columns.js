/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
    pgm.dropColumns("producao", [
        "peso_previsto",
        "taxa_conversao_planejada",
        "taxa_conversao_real",
    ]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
    pgm.addColumns("producao", {
        peso_previsto: { type: "numeric(10,3)", default: 0 },
        taxa_conversao_planejada: { type: "numeric(5,2)", default: 0 },
        taxa_conversao_real: { type: "numeric(5,2)", default: 0 },
    });
};
