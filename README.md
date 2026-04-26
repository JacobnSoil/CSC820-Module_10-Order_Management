# CSC820 Module 13 — Order Management API Deployment

A RESTful Order Management API for CSC 820: Large-Scale Software Systems at Penn State, deployed to an Ubuntu VM via Ansible. The API is built with Node.js, Express, and embedded SQLite via `better-sqlite3`, supporting full CRUD operations on customer orders.

## Repository Contents

| File | Purpose |
|------|---------|
| `app.js` | Express application (routes, database access) |
| `server.js` | Entry point that starts the HTTP listener |
| `package.json` | Node.js dependencies |
| `deploy.yml` | Ansible playbook for full automated deployment |
| `rollback.yml` | Ansible playbook to undo the deployment |
| `test.sh` | Bash verification script |

## Prerequisites

**Control machine (where Ansible runs):**
- Ansible installed (`sudo dnf install ansible` on Fedora; `sudo apt install ansible` on Debian/Ubuntu)
- `ansible.posix` collection installed (`ansible-galaxy collection install ansible.posix`)
- `rsync` installed (`sudo dnf install rsync`)
- An SSH key pair (`~/.ssh/id_ed25519` by default)
- The application repository cloned locally

**Target VM:**
- Ubuntu Server 24.04 LTS
- Reachable over SSH from the control machine
- A user account (e.g., `jake`) with sudo privileges
- Control machine's SSH public key in `~/.ssh/authorized_keys` on the VM (set up via `ssh-copy-id`)
- `rsync` installed (default on Ubuntu Server)

## Deployment

From the control machine, in this repository's directory:

```bash
ansible-playbook -i "<VM_IP>," -u <USER> --private-key ~/.ssh/id_ed25519 -K deploy.yml
```

- Replace `<VM_IP>` with the VM's IP (e.g., `192.168.122.238` for a libvirt NAT VM)
- Replace `<USER>` with the SSH user on the VM (e.g., `jake`)
- The `-K` flag prompts for the user's sudo password
- The trailing comma after `<VM_IP>` is required — it tells Ansible the inventory is an inline list

The playbook performs the following:
1. Adds NodeSource's apt repository and installs Node.js 20 (Ubuntu's default Node 18 is incompatible with `better-sqlite3` v12+)
2. Installs build tools (`build-essential`, `python3`) for compiling native modules
3. Installs and configures PostgreSQL (per assignment requirements; see Known Issues)
4. Creates a database and application user
5. Copies application source from the control machine to `/home/ubuntu/my-node-app/` (excludes `node_modules`, `.git`, etc.)
6. Installs Node.js dependencies fresh on the target
7. Installs PM2 globally
8. Starts the application via PM2 (`pm2 start server.js --name my-node-app`)

## Accessing the Application

After deployment, the API listens on port 3000.

**From the VM itself:**
```bash
curl http://localhost:3000/
curl http://localhost:3000/orders
```

**From the same network as the VM (e.g., libvirt host or LAN if bridged):**
Open a browser to `http://<VM_IP>:3000` or use `curl`.

**Endpoints:**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health check |
| GET | `/orders` | List all orders |
| POST | `/orders` | Create a new order (JSON body: item, quantity, price) |
| GET | `/orders/:id` | Retrieve a specific order |
| PATCH | `/orders/:id` | Update an order's status |
| DELETE | `/orders/:id` | Delete an order |

## Verification

Run the verification script from the control machine:

```bash
chmod +x test.sh
./test.sh <VM_IP>
```

The script exercises the API by hitting the root endpoint, the `/orders` list endpoint, creating a new order via POST, and retrieving it by ID. All four checks must pass for the deployment to be considered successful.

## Rollback

To completely undo the deployment (stops PM2, removes the app directory, uninstalls PostgreSQL):

```bash
ansible-playbook -i "<VM_IP>," -u <USER> --private-key ~/.ssh/id_ed25519 -K rollback.yml
```

After rollback, the VM is returned to its pre-deploy state.

## Known Issues and Limitations

**Node.js version requirement.** Ubuntu 24.04's default `nodejs` apt package is v18.19.1, which is incompatible with `better-sqlite3` v12+ (requires Node 20+). The playbook installs Node.js 20 from NodeSource's apt repository to resolve this. Earlier deploys using `apt install nodejs` directly will produce a `NODE_MODULE_VERSION` mismatch error and the application will fail to start.

**Native module rebuild.** The Ansible `copy`/`synchronize` step explicitly excludes `node_modules` from the source directory. If a stale `node_modules` from the control machine were copied to the VM, the compiled native bindings (e.g., `better-sqlite3`'s `.node` file) would not match the target VM's Node version. The playbook also explicitly removes any pre-existing `node_modules` on the VM before running `npm install` to guarantee a clean rebuild.

**Application entry point.** This project follows a two-file structure: `app.js` defines and exports the Express application, while `server.js` is the entry point that imports the app and starts the HTTP listener. The PM2 task launches `server.js`. Running `pm2 start app.js` would appear to succeed (PM2 reports "online") but the process exits immediately because `app.js` does not call `app.listen()` — a silent failure mode worth noting.

**Database mismatch with assignment requirements.** The playbook installs PostgreSQL per assignment instructions, but this application uses embedded SQLite via `better-sqlite3`. The PostgreSQL installation demonstrates Ansible's database management capabilities but is not used by the application at runtime.

**libvirt NAT networking.** This deployment was tested against a local KVM/libvirt VM using NAT networking (`192.168.122.0/24`). The VM is only reachable from the libvirt host. To reach the application from other LAN devices (e.g., a phone or laptop), use SSH port forwarding:
```bash
ssh -L 3000:<VM_IP>:3000 <user>@<libvirt-host-ip>
```
For broader access, switch the VM to bridged networking. The same playbook works against AWS EC2 or any cloud-provider VM by substituting the public IP.

**Hardcoded credentials.** The PostgreSQL password is currently in plaintext in `deploy.yml`. In a production deployment, this should be migrated to Ansible Vault.

**PM2 idempotency.** Running `deploy.yml` against a VM where the application is already running under PM2 will fail at the PM2 start task because PM2 will report a duplicate process name. Workaround: run `rollback.yml` first, or manually `sudo pm2 delete my-node-app` on the VM before re-deploying.
