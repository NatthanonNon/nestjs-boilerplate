exports.up = async function up(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email').notNullable().unique();
    table.string('name').notNullable();
    table.enu('role', ['admin', 'user']).notNullable().defaultTo('user');
    table.timestamps(true, true);
    table.string('image_path');
  });
};

exports.down = function down(knex) {
  return knex.schema.dropTableIfExists('users');
};
