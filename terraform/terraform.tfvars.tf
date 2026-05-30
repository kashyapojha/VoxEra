# ── terraform.tfvars ──
# Fill in your actual values here.
# DO NOT commit this file to GitHub — it is in .gitignore

aws_region    = "ap-south-1"
instance_type = "t2.micro"

# Paste your SSH public key here
# Generate: ssh-keygen -t rsa -b 4096 -f voipsight-key
# Then: cat voipsight-key.pub
ssh_public_key = "ssh-rsa AAAA... your public key here"

# Restrict SSH to your IP only for security
# Find your IP: https://whatismyip.com
ssh_allowed_cidr = "0.0.0.0/0"