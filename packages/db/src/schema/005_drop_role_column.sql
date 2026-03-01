-- Migration: Remove Better Auth admin plugin role column
-- Le plugin admin n'est plus utilisé ; la colonne role est remplacée par user_entity_role

ALTER TABLE "user" DROP COLUMN IF EXISTS role;
