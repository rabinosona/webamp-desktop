<a href="https://desktop.webamp.org/">
  <img src="./res/logo.svg" alt="Webamp on desktop logo" width="384" height="128">
</a>

<div align="center">
  <h3>Webamp on desktop</h3>
  <p>Just like the original — now on your Mac, Windows, or Linux!</p>

  <p>
    <a href="https://desktop.webamp.org/">
      <img src="./res/screen-win.gif" alt="Screenshot of Webamp desktop on Windows">
    </a>
    <a href="https://desktop.webamp.org/">
      <img src="./res/screen-linux.png" alt="Screenshot of Webamp on Linux">
    </a>
    <a href="https://desktop.webamp.org/">
      <img src="./res/screen-mac.png" alt="Screenshot of Webamp on Mac OS X">
    </a>
  </p>
</div>


<br>

Unofficial app. It has most of the functionality of the original Winamp, but it's still more of a proof of concept. Based on the [Webamp](https://github.com/captbaritone/webamp) - "A reimplementation of Winamp 2.9 in HTML5 and JavaScript." by the [@captbaritone](https://github.com/captbaritone) and the Webamp-Desktop by durasj. Linux support via AppImage and .deb package tested on the Ubuntu 18.04.

## Downloads

Currently, you have to build the app yourself. Use the following commands:

```
git clone https://github.com/rabinosona/webamp-desktop.git
cd webamp-desktop
npm i
npm run pack:$yourSystem (mac/windows/linux)
```

## Known issues

### Installation files are not trusted

Some operating systems, especially Windows or some browsers do not trust the installation files because they are not digitally signed and/or commonly used yet. Unfortunately, code signing certificates that would help us overcome this cost hundreds of euro per year. This project does not have any funding and therefore can't afford it. It's recommended to verify the checksum of the files if you are worried. Every commit (and therefore published checksum) is signed in this repository.

### Poor performance on Linux

Caused by the disabled hardware acceleration on the Linux. The reason is [issues with the transparency on the Chromium project](https://bugs.chromium.org/p/chromium/issues/detail?id=854601#c7).

### WIP playlist/EQ resize and hiding

The main point of this repo is to fix the issue with the original implementation, that stretches across entire screen, blocking the UI interactions with the other apps unless switching the Webamp Desktop window.

This was remedied by rewriting the window size detection algorithm, but it's not perfect and it doesn't work well with the context menu and resizing the Winamp tabs, namely, the playlist and the equalizer tab.

## Developing

### Prerequisites

Make sure you have latest [node.js](https://nodejs.org/en/) and [yarn](https://yarnpkg.com/lang/en/).

### Installing

Clone this repository, install dependencies and run the start script:

```
git clone https://github.com/rabinosona/webamp-desktop.git
cd webamp-desktop
yarn install
yarn start
```

After the build has completed, you should see one window with the app and one with developer tools. To try some changes, you can: change the code in the `./src` dir, close the current window and run the `yarn start` again.

## Kudos

This project is possible thanks to the [Webamp](https://github.com/captbaritone/webamp) from [@captbaritone](https://github.com/captbaritone) and wonderful open source work of others like [@jberg](https://github.com/jberg) and authors of [many dependencies](https://github.com/durasj/webamp-desktop/blob/master/package.json) and durasj for wrapping the web app in Electron.

Thumbar icons on Windows by [Smashicons](https://smashicons.com).

## Disclaimer

Not affiliated with the [Winamp](http://www.winamp.com/). All product names, logos, and brands are property of their respective owners.
