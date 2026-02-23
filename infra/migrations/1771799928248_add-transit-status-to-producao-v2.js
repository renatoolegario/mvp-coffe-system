/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    // Altera a coluna status de int para text para melhor leitura das fases
    pgm.alterColumn("producao", "status", {
        type: "text",
        default: "PENDENTE",
        using: "CASE WHEN status = 1 THEN 'PENDENTE' ELSE 'CONCLUIDA' END"
    });
};

exports.down = pgm => {
    pgm.alterColumn("producao", "status", {
        type: "smallint",
        default: 1,
        using: "CASE WHEN status = 'PENDENTE' THEN 1 ELSE 2 END"
    });
};
