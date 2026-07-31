-- ============================================================================
--  Domani Mailer — migração 0005: design dos templates (editor de blocos)
--  Guarda o JSON do Unlayer para o template poder ser reaberto e editado.
--  Rodar depois de 0001, 0003 e 0004.
-- ============================================================================

alter table templates add column if not exists design jsonb;
