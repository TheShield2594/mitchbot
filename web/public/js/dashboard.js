// Fetch user info and guilds
async function loadServers() {
  try {
    const response = await fetch('/auth/me');

    if (!response.ok) {
      window.location.href = '/auth/login';
      return;
    }

    const user = await response.json();
    const serverList = document.getElementById('server-list');

    // Filter guilds where user has MANAGE_SERVER permission
    const manageableGuilds = user.guilds.filter(guild => {
      const permissions = parseInt(guild.permissions);
      return (permissions & 0x20) === 0x20; // MANAGE_SERVER
    });

    if (manageableGuilds.length === 0) {
      serverList.innerHTML = '<p>You don\'t have permission to manage any servers where Mitchbot is installed.</p>';
      return;
    }

    serverList.innerHTML = '';

    manageableGuilds.forEach(guild => {
      const card = document.createElement('div');
      card.className = 'server-card';
      card.onclick = () => window.location.href = `/guild/${guild.id}`;

      const icon = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
        : 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%23667eea" width="100" height="100"/></svg>';

      card.innerHTML = `
        <img src="${icon}" alt="${guild.name}">
        <h3>${guild.name}</h3>
      `;

      serverList.appendChild(card);
    });
  } catch (error) {
    console.error('Error loading servers:', error);
    document.getElementById('server-list').innerHTML = '<p>Failed to load servers.</p>';
  }
}

loadServers();
