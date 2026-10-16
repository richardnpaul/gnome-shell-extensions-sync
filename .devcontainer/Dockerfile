FROM mcr.microsoft.com/devcontainers/base:ubuntu-24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install GNOME Shell, GJS, Libadwaita, GTK4, Soup3, Xvfb, D-Bus, and build tooling
RUN apt-get update && apt-get install -y --no-install-recommends \
    gnome-shell \
    gjs \
    libglib2.0-bin \
    libadwaita-1-dev \
    gir1.2-adw-1 \
    gir1.2-gtk-4.0 \
    gir1.2-soup-3.0 \
    xvfb \
    dbus-x11 \
    dbus-user-session \
    x11-utils \
    zip \
    gettext \
    pipx \
    python3-venv \
    python3-pip \
    imagemagick \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 22 LTS via NodeSource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install pre-commit and shexli using pipx under vscode user
USER vscode
ENV PATH="/home/vscode/.local/bin:${PATH}"
RUN pipx install pre-commit \
    && pipx install shexli \
    && pipx ensurepath
