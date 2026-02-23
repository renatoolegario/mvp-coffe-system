/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumn("insumos", {
        pode_ser_insumo: { type: "boolean", notNull: true, default: true },
        pode_ser_produzivel: { type: "boolean", notNull: true, default: false },
        pode_ser_vendido: { type: "boolean", notNull: true, default: false },
    });

    // Atualiza categorias baseadas em dados existentes
    // "MATERIA_PRIMA" geralmente é o insumo principal
    pgm.sql(`
    UPDATE insumos 
    SET pode_ser_insumo = true, pode_ser_produzivel = false, pode_ser_vendido = true
    WHERE tipo = 'MATERIA_PRIMA'
  `);
};

exports.down = pgm => {
    pgm.dropColumn("insumos", ["pode_ser_insumo", "pode_ser_produzivel", "pode_ser_vendido"]);
};
