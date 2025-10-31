#!/usr/bin/env bash

# Robust SSH tunnel starter that can try multiple candidate IPs and report status.
# It prefers reading HOSTS from the environment (space-separated) or a default list.
# Usage:
#   HOSTS="172.16.10.159 172.16.12.166" ./start-ssh-tunnel.sh
#   OR
#   ./start-ssh-tunnel.sh
# To set a specific host use: ./start-ssh-tunnel.sh 172.16.10.159

set -euo pipefail

PORT_LOCAL=${PORT_LOCAL:-15432}
PORT_REMOTE=${PORT_REMOTE:-5432}
SSH_USER=${SSH_USER:-sumitsihag}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519}
CHECK_TIMEOUT=${CHECK_TIMEOUT:-3}

if [ "$#" -ge 1 ]; then
	HOSTS="$1"
else
	# Read HOSTS from env or fall back to a curated list. Update this list when you get a new IP.
  HOSTS=${HOSTS:-"172.16.10.127 172.16.12.223 10.23.59.50 172.16.10.159 172.16.12.166 192.168.29.140"}
fi

echo "Using ssh key: $SSH_KEY"
echo "Will attempt to open tunnel local:$PORT_LOCAL -> remote:$PORT_REMOTE using user $SSH_USER"

for HOST in $HOSTS; do
	echo "\nChecking host $HOST..."

	# Quick reachability check: TCP connect to port 22
	if timeout ${CHECK_TIMEOUT} bash -c "</dev/tcp/${HOST}/22" 2>/dev/null; then
		echo "SSH port 22 on $HOST is reachable. Attempting to establish tunnel..."

		# If ssh key requires passphrase, the command below will prompt; consider using ssh-agent.
		# Use -f -N to background the process. If you prefer to see prompts, remove -f.
		ssh -i "$SSH_KEY" -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -f -N -L ${PORT_LOCAL}:localhost:${PORT_REMOTE} ${SSH_USER}@${HOST} || {
			echo "ssh command failed for $HOST; continuing to next candidate"
			continue
		}

		# Give the OS a moment to bind the port
		sleep 1

		if ss -ltn | grep -q ":${PORT_LOCAL} "; then
			echo "Tunnel established to $HOST and listening on localhost:${PORT_LOCAL}"
			exit 0
		else
			echo "SSH command succeeded but localhost:${PORT_LOCAL} is not listening. Cleaning up and trying next host."
			# Attempt to kill any leftover ssh process that forwarded this port
			pkill -f "-L ${PORT_LOCAL}:localhost:${PORT_REMOTE}" || true
		fi
	else
		echo "Host $HOST is not reachable on port 22 (timeout $CHECK_TIMEOUT s)."
	fi
done

echo "All candidate hosts exhausted. No tunnel established."
echo "Tips:"
echo " - Ensure your SSH key has no passphrase or that ssh-agent is running with the key loaded."
echo " - If host IP keeps changing, consider one of: dynamic DNS on the host, a reverse SSH tunnel to a stable VPS, or autossh systemd service."
exit 2
