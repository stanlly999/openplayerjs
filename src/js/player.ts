import IFile from './components/interfaces/media/file';
import Controls from './controls';
import Media from './media';
import Ads from './media/ads';
import { isAudio, isIframe, isVideo } from './utils/dom';

/**
 *
 * @class Player
 * @description Class that creates an Open Player instance.
 * This is the entry point for the entire plugin.
 */
class Player {
    public static instances: any;

    /**
     * Entry point
     * Convert all the video/audio tags with `om-player` class in a OpenMedia player
     */
    public static init() {
        Player.instances = {};
        const targets = document.querySelectorAll('video.om-player, audio.om-player');
        for (let i = 0, total = targets.length; i < total; i++) {
            const target = targets[i];
            const player = new Player(target, target.getAttribute('data-om-ads'));
            player.init();
        }
    }

    public uid: string;
    public element: Element;
    public adsUrl?: string;
    public ads: Ads;
    public media: Media;

    /**
     * Creates an instance of Player.
     * @param {Element|string} element
     * @param {?string} adsUrl
     * @memberof Player
     */
    constructor(element: Element|string, adsUrl?: string) {
        this.element = element instanceof Element ? element : document.getElementById(element);
        this.adsUrl = adsUrl;
        this.ads = null;
        return this;
    }

    public init() {
        if (this._isValid()) {
            this._prepareMedia();
            this._wrapInstance();
            this._createControls();
            this._createUID();
            Player.instances[this.uid] = this;
        }
    }

    public load() {
        if (this.media instanceof Media) {
            this.media.load();
        }
    }

    public play() {
        if (this.ads) {
            this.ads.play();
        } else {
            this.media.play();
        }
    }

    public pause() {
        if (this.ads) {
            this.ads.pause();
        } else {
            this.media.pause();
        }
    }

    public destroy() {
        if (this.ads) {
            this.ads.destroy();
        } else {
            if (this.element.getAttribute('data-om-file')) {
                (this.element as HTMLMediaElement).src = this.element.getAttribute('data-om-file');
                this.element.removeAttribute('data-om-file');
            }
            this.media.destroy();
        }
    }

    set src(media: IFile[]) {
        if (this.media instanceof Media) {
            this.media.mediaFiles = [];
            this.media.src = media;
        }
    }

    get src() {
        return this.media.src;
    }

    public activeElement() {
        return this.ads && this.ads.adsStarted ? this.ads : this.media;
    }

    /**
     * Check if the element passed in the constructor is a valid video/audio/iframe tag
     * with 'om-player' class
     * @private
     * @memberof Player
     * @return {boolean}
     */
    private _isValid() {
        const el = this.element;

        if (el instanceof HTMLElement === false) {
            return false;
        }

        if (!isAudio(el) && !isVideo(el) && !isIframe(el)) {
            return false;
        }

        if (!el.classList.contains('om-player')) {
            return false;
        }

        return true;
    }

    /**
     * Wrap media instance within a DIV
     * @private
     * @memberof Player
     */
    private _wrapInstance() {
        const wrapper = document.createElement('div');
        wrapper.className = 'om-player om-player__keyboard--inactive';
        wrapper.className += isAudio(this.element) ? ' om-player__audio' : ' om-player__video';

        this.element.classList.remove('om-player');
        this.element.parentNode.insertBefore(wrapper, this.element);
        wrapper.appendChild(this.element);

        wrapper.addEventListener('keydown', () => {
            if (wrapper.classList.contains('om-player__keyboard--inactive')) {
                wrapper.classList.remove('om-player__keyboard--inactive');
            }
        });

        wrapper.addEventListener('click', () => {
            if (!wrapper.classList.contains('om-player__keyboard--inactive')) {
                wrapper.classList.add('om-player__keyboard--inactive');
            }
        });
    }

    /**
     * Build HTML markup for media controls
     *
     * @memberof Player
     */
    private _createControls() {
        const controls = new Controls(this);
        controls.prepare();
        controls.render();
    }

    /**
     * Load callbacks/events depending of media type
     *
     * @memberof Player
     */
    private _prepareMedia() {
        try {
            this.media = new Media(this.element);
            this.media.load();

            if (this.adsUrl) {
                this.ads = new Ads(this.media, this.adsUrl);
            }

            if (isIframe(this.element)) {
                this._buildResponsiveIframe();
            }
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Check for aspect ratio and create responsive behavior on an iframe
     * @private
     * @memberof Player
     */
    private _buildResponsiveIframe() {
        const el = this.element;
        /**
         * Change dimensions of iframe when resizing window
         * @private
         */
        const resizeIframeCallback = (): void => {
            const width = (el.parentNode as HTMLElement).offsetWidth;
            const height = width * parseFloat(el.getAttribute('data-ratio'));
            (el as HTMLElement).style.width = `${width}px`;
            (el as HTMLElement).style.height = `${height}px`;
        };

        // This workflow is used when the aspect ratio of the media is unknown
        const ratio = parseFloat(el.getAttribute('height')) / parseFloat(el.getAttribute('width'));
        el.setAttribute('data-ratio', `${ratio}`);
        el.removeAttribute('width');
        el.removeAttribute('height');

        // Resize correctly on page load
        const event = new Event('resize');
        window.addEventListener('resize', resizeIframeCallback);
        window.dispatchEvent(event);
    }

    private _createUID() {
        if (this.element.id) {
            this.uid = this.element.id;
            this.element.removeAttribute('id');
        } else {
            let uid;
            do  {
                uid = `om_${Math.random().toString(36).substr(2, 9)}`;
            } while (Player.instances[uid] !== undefined);
            this.uid = uid;
        }
        (this.element.parentNode as HTMLElement).id = this.uid;
    }
}

export default Player;

// Expose element globally
(window as any).OpenPlayer = Player;

Player.init();
