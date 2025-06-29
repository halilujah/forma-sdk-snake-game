import { h } from 'preact';
import { render } from 'preact';
import { signal } from '@preact/signals';
import './wasd-camera-control';
import { init } from './wasd-camera-control';
export const scoreSignal = signal(1);
export const levelSignal = signal(1);
export const maxScoreSignal = signal(2);
export const isGameOver = signal(false);

const pressedKeys = signal(new Set<string>());

window.addEventListener('keydown', e => {
    pressedKeys.value = new Set(pressedKeys.value).add(e.key.toLowerCase());
});
window.addEventListener('keyup', e => {
    const newSet = new Set(pressedKeys.value);
    newSet.delete(e.key.toLowerCase());
    pressedKeys.value = newSet;
});
const keyStyle = (key: string) => ({
    width: '2.5rem',
    height: '2.5rem',
    margin: '0.2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    borderRadius: '6px',
    background: pressedKeys.value.has(key) ? '#2ecc71' : '#333',
    color: pressedKeys.value.has(key) ? 'white' : '#aaa',
    transition: 'background 0.2s, color 0.2s',
});



const startGame = () => {
    isGameOver.value = false;
    scoreSignal.value = 1;
    levelSignal.value = 1;
    maxScoreSignal.value = 2;
    init()
    // TODO: reset game state (worm, score, level, etc.)
};


const App = () => {
    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
            <h2>Urban Snake</h2>
            <p>Slither, eat, grow - all in Forma terrain.</p>

            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
                padding: '0.5rem 1rem',
                background: 'rgba(0, 0, 0, 0.6)',
                color: 'white',
                fontSize: '1.5rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap'
            }}>
                Level: {levelSignal.value} Score: {scoreSignal.value}/{maxScoreSignal.value}
            </div>

            {isGameOver.value && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    textAlign: 'center',
                    color: 'white',
                    zIndex: 1000,
                }}>
                    <h1 style={{ marginBottom: '1rem', fontSize: '2rem' }}>Game Over</h1>
                    <p style={{ marginBottom: '2rem', fontSize: '1.2rem' }}>Your score: {scoreSignal.value}</p>
                    <button
                        onClick={startGame}
                        style={{
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#00bfff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: 'pointer'
                        }}
                    >
                        Start Again
                    </button>
                </div>
            )}

            <div style={{
                position: 'absolute',
                top: '80%',
                left: '60%',
                display: 'flex',
                transform: 'translate(-80%,-60%)',
                flexDirection: 'column',
                alignItems: 'center',
            }}>
                <div style={keyStyle('w')}>W</div>
                <div style={{ display: 'flex' }}>
                    <div style={keyStyle('a')}>A</div>
                    <div style={keyStyle('s')}>S</div>
                    <div style={keyStyle('d')}>D</div>
                </div>
            </div>
        </div>
    );
};


const root = document.getElementById('app');
if (root) {
    render(<App />, root);
}
