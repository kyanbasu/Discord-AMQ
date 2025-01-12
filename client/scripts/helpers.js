import crownSrc from '/static/crown.svg'

export async function appendUserAvatar(user, isHost=false) {
    const navbar = document.getElementById('navbar')

    let avatarSrc = '';
    if (user.avatar) {
        avatarSrc = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
    } else {
        const defaultAvatarIndex = Math.abs(Number(auth.user.id) >> 22) % 6;
        avatarSrc = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`
    }
    const container = document.createElement('div');
    container.setAttribute('style', 'display:flex;align-items:center;max-width:100px');

    const avatarImg = document.createElement('img');
    avatarImg.setAttribute(
        'src',
        avatarSrc
    );
    avatarImg.setAttribute('height', '80%');
    avatarImg.setAttribute('style', 'border-radius: 50%;');

    container.appendChild(avatarImg)

    if(isHost){
        const crownImg = document.createElement('img');
        crownImg.setAttribute(
            'src',
            crownSrc
        );
        crownImg.setAttribute('style', `position:absolute;height:16px;top:${navigator.userAgentData.mobile ? "40px" : "0"};margin-left:4px;`)
        container.appendChild(crownImg)
    }

    
    navbar.appendChild(container);
}

export async function appendVoiceChannelName(discordSdk, socket, user) {
    const roomName = document.getElementById('roomName')

    let activityChannelName = null;

    // Requesting the channel in GDMs (when the guild ID is null) requires
    // the dm_channels.read scope which requires Discord approval.
    if (discordSdk.channelId != null && discordSdk.guildId != null) {
        // Joining Socket.io Room with name <guildId>/<channelId>
        socket.emit("join-room", `${discordSdk.guildId}/${discordSdk.channelId}`, user)
        const channel = await discordSdk.commands.getChannel({channel_id: discordSdk.channelId});
        if (channel.name != null) {
            activityChannelName = channel.name;
        }
    }

    // Update the UI with the name of the current voice channel
    roomName.innerHTML = `room: ${activityChannelName}`
}

export function removeFadeOut( el, speed ) {
    if(!el) return
    var seconds = speed/1000;
    el.style.transition = "opacity "+seconds+"s ease";

    el.style.opacity = 0;
    setTimeout(function() {
        el.parentNode.removeChild(el);
    }, speed);
}

export function displayMessage(message){
    const el = document.createElement('li');
    el.innerHTML = message;
    el.style.float = "none";
    document.getElementById("chat").appendChild(el);
    document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
}