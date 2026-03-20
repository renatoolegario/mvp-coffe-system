exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE insumos
      ADD COLUMN IF NOT EXISTS aparecer_pagina_inicial boolean,
      ADD COLUMN IF NOT EXISTS valor_venda numeric,
      ADD COLUMN IF NOT EXISTS imagem_pagina_inicial_base64 text,
      ADD COLUMN IF NOT EXISTS descricao text
  `);

  pgm.sql(`
    UPDATE insumos
    SET
      aparecer_pagina_inicial = COALESCE(aparecer_pagina_inicial, false),
      valor_venda = COALESCE(valor_venda, 0),
      imagem_pagina_inicial_base64 = COALESCE(imagem_pagina_inicial_base64, ''),
      descricao = COALESCE(descricao, '')
  `);

  pgm.sql(`
    ALTER TABLE insumos
      ALTER COLUMN aparecer_pagina_inicial SET DEFAULT false,
      ALTER COLUMN aparecer_pagina_inicial SET NOT NULL,
      ALTER COLUMN valor_venda SET DEFAULT 0,
      ALTER COLUMN valor_venda SET NOT NULL,
      ALTER COLUMN imagem_pagina_inicial_base64 SET DEFAULT '',
      ALTER COLUMN imagem_pagina_inicial_base64 SET NOT NULL,
      ALTER COLUMN descricao SET DEFAULT '',
      ALTER COLUMN descricao SET NOT NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE insumos
      DROP COLUMN IF EXISTS aparecer_pagina_inicial,
      DROP COLUMN IF EXISTS valor_venda,
      DROP COLUMN IF EXISTS imagem_pagina_inicial_base64,
      DROP COLUMN IF EXISTS descricao
  `);
};
