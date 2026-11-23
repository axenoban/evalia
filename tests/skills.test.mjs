import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const skills = ["evalia-formularios","evalia-catalogo","evalia-reservas-pedidos","evalia-ux-visual","evalia-pruebas-e2e","evalia-seguridad-supabase","supabase-postgres-best-practices"];
for (const name of skills) {
  test('skill compartida disponible: ' + name, () => {
    for (const prefix of ['.agents/skills', '.claude/skills']) {
      const path = prefix + '/' + name + '/SKILL.md';
      assert.ok(existsSync(path), 'Falta ' + path);
      const content = readFileSync(path, 'utf8');
      assert.match(content, /^---\nname: [a-z0-9-]+\ndescription: /);
      assert.ok(content.includes('name: ' + name), 'Nombre incorrecto ' + path);
    }
    assert.ok(readFileSync('.claude/skills/' + name + '/SKILL.md', 'utf8').includes('.agents/skills/' + name + '/SKILL.md'));
  });
}
test('Supabase instalada con reglas críticas y licencia', () => {
  for (const path of ['LICENSE', 'references/security-rls-basics.md', 'references/lock-deadlock-prevention.md', 'references/schema-constraints.md']) {
    assert.ok(existsSync('.agents/skills/supabase-postgres-best-practices/' + path));
  }
});
