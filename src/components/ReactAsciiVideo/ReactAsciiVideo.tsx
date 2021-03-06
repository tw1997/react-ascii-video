import * as React from 'react';
import ControlBar from './ControlBar/ControlBar';
import image2ascii from './image2ascii';
import './ReactAsciiVideo.css';
import { calcVideoOffsetSize } from './utils';

export interface IProps {
  src: string;
  volume?: number;
  width?: number;
  height?: number;
  onPlay?: () => void;
}

interface IState {
  charSize: {
    height: number;
    width: number;
  },
  height: number;
  playing: boolean;
  width: number;
  currentTime: number;
  duration: number;
}

export default class ReactAsciiVideo extends React.PureComponent<IProps, IState> {

  public static defaultProps: Partial<IProps> = {
    onPlay: () => undefined,
    volume: 0,
  }

  private video: HTMLVideoElement;

  private originalCanvas: HTMLCanvasElement;
  private originalCanvasCtx: CanvasRenderingContext2D;
  private originalCanvasSize: { height: number, width: number };

  private targetCanvas: HTMLCanvasElement;
  private targetCanvasCtx: CanvasRenderingContext2D;
  private targetCanvasRef: React.RefObject<HTMLCanvasElement>;
  private requestAnimationFrameId: number | null;
  constructor(props: IProps) {
    super(props);
    this.state = {
      charSize: {
        height: 5 / 1.3,
        width: 5 / 1.3,
      },
      height: 0,
      playing: false,
      width: 0,
    } as IState;
    this.originalCanvasSize = { height: 0, width: 0 };
    this.targetCanvasRef = React.createRef<HTMLCanvasElement>();
    this.requestAnimationFrameId = null;
  }
  public async componentDidUpdate(prevProps: IProps) {
    if (this.props.src !== prevProps.src) {
      await this.init()
      if (this.state.playing) {
        this.play();
      }
    }
  }
  public componentDidMount() {
    this.init();
  }

  public render() {
    return (
      <div className="react_ascii_video">
        <canvas className="target_canvas" ref={this.targetCanvasRef} width={this.props.width || this.state.width} height={this.props.height} />
        <ControlBar
          onPlay={this.play}
          onPause={this.pause}
          playing={this.state.playing}
          duration={this.state.duration}
          currentTime={this.state.currentTime}
        />
      </div>
    );
  }

  public pause = () => {
    this.video.pause();
    this.setState({ playing: false });
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
      this.requestAnimationFrameId = null;
    }
  }

  public play = () => {
    this.video.play();
    this.setState({ playing: true });
    if (this.requestAnimationFrameId) {
      cancelAnimationFrame(this.requestAnimationFrameId);
      this.requestAnimationFrameId = null;
    }
    this.startRenderAscii();
  }

  private async init() {
    const { volume, src, onPlay, height, width } = this.props;

    if (!this.video) {
      this.video = document.createElement('video');
    }
    this.video.src = src;
    this.video.volume = volume!;
    this.video.addEventListener('play', onPlay!);

    if (height) {
      this.video.height = height;
    }
    if (width) {
      this.video.width = width;
    }
    
    if (!this.originalCanvas) {
      this.originalCanvas = document.createElement('canvas');
    }

    this.targetCanvas = this.targetCanvasRef.current!;

    this.targetCanvasCtx = this.targetCanvas.getContext('2d') as CanvasRenderingContext2D;
    this.originalCanvasCtx = this.originalCanvas.getContext('2d') as CanvasRenderingContext2D;

    const size = await calcVideoOffsetSize(this.video);

    this.setState({ duration: this.video.duration });
    this.video.addEventListener('timeupdate', () => {
      this.setState({ currentTime: this.video.currentTime });
    })

    this.originalCanvasSize.width = this.originalCanvas.width = size.width / this.state.charSize.width;
    this.originalCanvasSize.height = this.originalCanvas.height = size.height / this.state.charSize.width;

    this.setState({ ...size });
    this.renderAscii();
  }

  private renderAscii(): void {
    this.originalCanvasCtx.drawImage(this.video, 0, 0, this.originalCanvasSize.width, this.originalCanvasSize.height);
    image2ascii(
      this.originalCanvasCtx.getImageData(0, 0, this.originalCanvasSize.width, this.originalCanvasSize.height),
      this.state.width,
      this.state.height,
      this.state.charSize,
      this.targetCanvasCtx,
    );
  }
  private startRenderAscii(): void {
    this.requestAnimationFrameId = requestAnimationFrame(() => {
      this.renderAscii();
      this.startRenderAscii();
    });
  }

}

