import { Nullable } from "../../types";
import { ThinEngine } from '../../Engines/thinEngine';
import { WebXRRenderTarget } from "./webXRTypes";
import { WebXRSessionManager } from './webXRSessionManager';

/**
 * COnfiguration object for WebXR output canvas
 */
export class WebXRManagedOutputCanvasOptions {
    /**
     * Options for this XR Layer output
     */
    public canvasOptions?: XRWebGLLayerOptions;

    /**
     * CSS styling for a newly created canvas (if not provided)
     */
    public newCanvasCssStyle?: string;

    /**
     * An optional canvas in case you wish to create it yourself and provide it here.
     * If not provided, a new canvas will be created
     */
    public canvasElement?: HTMLCanvasElement;

    /**
     * Get the default values of the configuration object
     * @returns default values of this configuration object
     */
    public static GetDefaults(): WebXRManagedOutputCanvasOptions {
        const defaults = new WebXRManagedOutputCanvasOptions();
        defaults.canvasOptions = {
            antialias: true,
            depth: true,
            stencil: false,
            alpha: true,
            multiview: false,
            framebufferScaleFactor: 1
        };

        defaults.newCanvasCssStyle = "position:absolute; bottom:0px;right:0px;z-index:10;width:90%;height:100%;background-color: #000000;";

        return defaults;
    }
}
/**
 * Creates a canvas that is added/removed from the webpage when entering/exiting XR
 */
export class WebXRManagedOutputCanvas implements WebXRRenderTarget {

    private _engine: ThinEngine;
    private _canvas: Nullable<HTMLCanvasElement> = null;

    /**
     * Rendering context of the canvas which can be used to display/mirror xr content
     */
    public canvasContext: WebGLRenderingContext;
    /**
     * xr layer for the canvas
     */
    public xrLayer: Nullable<XRWebGLLayer> = null;

    /**
     * Initializes the xr layer for the session
     * @param xrSession xr session
     * @returns a promise that will resolve once the XR Layer has been created
     */
    public initializeXRLayerAsync(xrSession: XRSession): Promise<XRWebGLLayer> {

        const createLayer = () => {
            return new XRWebGLLayer(xrSession, this.canvasContext, this._options.canvasOptions);
        };

        // support canvases without makeXRCompatible
        if (!(this.canvasContext as any).makeXRCompatible) {
            this.xrLayer = createLayer();
            return Promise.resolve(this.xrLayer);
        }

        return (this.canvasContext as any).makeXRCompatible().then(() => {
            this.xrLayer = createLayer();
            return this.xrLayer;
        });
    }

    /**
     * Initializes the canvas to be added/removed upon entering/exiting xr
     * @param _xrSessionManager The XR Session manager
     * @param _options optional configuration for this canvas output. defaults will be used if not provided
     */
    constructor(_xrSessionManager: WebXRSessionManager, private _options: WebXRManagedOutputCanvasOptions = WebXRManagedOutputCanvasOptions.GetDefaults()) {
        this._engine = _xrSessionManager.scene.getEngine();
        if (!_options.canvasElement) {
            const canvas = document.createElement('canvas');
            canvas.style.cssText = this._options.newCanvasCssStyle || "position:absolute; bottom:0px;right:0px;";
            this._setManagedOutputCanvas(canvas);
        } else {
            this._setManagedOutputCanvas(_options.canvasElement);
        }

        _xrSessionManager.onXRSessionInit.add(() => {
            this._addCanvas();
        });

        _xrSessionManager.onXRSessionEnded.add(() => {
            this._removeCanvas();
        });
    }
    /**
     * Disposes of the object
     */
    public dispose() {
        this._removeCanvas();
        this._setManagedOutputCanvas(null);
    }

    private _setManagedOutputCanvas(canvas: Nullable<HTMLCanvasElement>) {
        this._removeCanvas();
        if (!canvas) {
            this._canvas = null;
            (this.canvasContext as any) = null;
        } else {
            this._canvas = canvas;
            this.canvasContext = <any>this._canvas.getContext('webgl2');
            if (!this.canvasContext) {
                this.canvasContext = <any>this._canvas.getContext('webgl');
            }
        }
    }

    private _addCanvas() {
        if (this._canvas && this._canvas !== this._engine.getRenderingCanvas()) {
            document.body.appendChild(this._canvas);
        }
    }

    private _removeCanvas() {
        if (this._canvas && document.body.contains(this._canvas) && this._canvas !== this._engine.getRenderingCanvas()) {
            document.body.removeChild(this._canvas);
        }
    }
}