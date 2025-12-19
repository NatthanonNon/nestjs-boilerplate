exports.seed = async function seed(knex) {
  const existing = await knex('users').first('id');
  if (existing) {
    return;
  }

  await knex('users').insert([
    {
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    },
    {
      email: 'user@example.com',
      name: 'Sample User',
      role: 'user'
    }
  ]);
};
