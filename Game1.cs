using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using Microsoft.Xna.Framework.Input;
using System;
using System.Collections.Generic;

namespace Tugui;

public class Game1 : Game
{
    private GraphicsDeviceManager _graphics;
    private SpriteBatch _spriteBatch;
    private Texture2D _pixel;

    private KeyboardState _previousKeyboard;

    private StageGrid _grid;
    private PlayerState _player;

    private float _tickTimer = 0f;
    private float _tickInterval = 1.0f; // debug: 1 celda por segundo

    private int _activatedCount = 0;

    public Game1()
    {
        _graphics = new GraphicsDeviceManager(this);
        Content.RootDirectory = "Content";
        IsMouseVisible = true;

        _graphics.PreferredBackBufferWidth = 1280;
        _graphics.PreferredBackBufferHeight = 720;
    }

    protected override void Initialize()
    {
        _grid = StageGrid.CreateTestGrid5x5();

        _player = new PlayerState
        {
            Row = 2,
            Col = 2,
            PreviousRow = 2,
            PreviousCol = 2,
            Facing = Direction.North
        };

        ActivateCurrentCellIfNeeded();
        base.Initialize();
    }

    protected override void LoadContent()
    {
        _spriteBatch = new SpriteBatch(GraphicsDevice);

        _pixel = new Texture2D(GraphicsDevice, 1, 1);
        _pixel.SetData(new[] { Color.White });
    }

    protected override void Update(GameTime gameTime)
    {
        var keyboard = Keyboard.GetState();

        if (keyboard.IsKeyDown(Keys.Escape))
            Exit();

        HandleTurnInput(keyboard);

        _tickTimer += (float)gameTime.ElapsedGameTime.TotalSeconds;

        while (_tickTimer >= _tickInterval)
        {
            _tickTimer -= _tickInterval;
            AdvanceOneStep();
        }

        _previousKeyboard = keyboard;
        base.Update(gameTime);
    }

    protected override void Draw(GameTime gameTime)
    {
        GraphicsDevice.Clear(new Color(20, 16, 32));

        _spriteBatch.Begin();

        DrawBackground();
        DrawProjectedGrid();
        DrawPlayerMarker();
        DrawDebugHud();

        _spriteBatch.End();

        base.Draw(gameTime);
    }

    private void HandleTurnInput(KeyboardState keyboard)
    {
        if (IsKeyPressed(keyboard, Keys.Left))
            _player.Facing = TurnLeft(_player.Facing);

        if (IsKeyPressed(keyboard, Keys.Right))
            _player.Facing = TurnRight(_player.Facing);
    }

    private void AdvanceOneStep()
    {
        _player.PreviousRow = _player.Row;
        _player.PreviousCol = _player.Col;

        Point delta = DirectionToDelta(_player.Facing);

        int nextRow = _player.Row + delta.Y;
        int nextCol = _player.Col + delta.X;

        if (_grid.IsInside(nextRow, nextCol))
        {
            _player.Row = nextRow;
            _player.Col = nextCol;
            ActivateCurrentCellIfNeeded();
        }
        else
        {
            // si choca con borde, mantenerse en la misma celda
            _player.PreviousRow = _player.Row;
            _player.PreviousCol = _player.Col;
        }
    }

    private void ActivateCurrentCellIfNeeded()
    {
        var cell = _grid.Cells[_player.Row, _player.Col];

        if (cell.HasOrb && !cell.IsActivated)
        {
            cell.IsActivated = true;
            _activatedCount++;
        }
    }

    private void DrawBackground()
    {
        int w = _graphics.PreferredBackBufferWidth;
        int h = _graphics.PreferredBackBufferHeight;

        DrawRect(0, 0, w, h / 2, new Color(45, 10, 70));
        DrawRect(0, h / 2, w, h / 2, new Color(30, 18, 32));
        DrawRect(0, h / 2, w, 2, new Color(255, 220, 180, 40));
    }

    private void DrawProjectedGrid()
    {
        foreach (var item in GetVisibleCells())
        {
            DrawProjectedCell(item);
        }
    }

    private void DrawProjectedCell(ProjectedCell cell)
    {
        int x = (int)cell.ScreenPosition.X;
        int y = (int)cell.ScreenPosition.Y;
        int size = cell.Size;

        Color floorColor = ((cell.WorldRow + cell.WorldCol) % 2 == 0)
            ? new Color(210, 170, 95)
            : new Color(120, 55, 75);

        DrawRect(x - size / 2, y - size / 2, size, size, floorColor);

        if (cell.HasOrb)
        {
            int orbSize = (int)(size * 0.45f);
            Color orbColor = cell.IsActivated
                ? new Color(100, 255, 120)
                : new Color(80, 150, 255);

            DrawRect(
                x - orbSize / 2,
                y - orbSize / 2,
                orbSize,
                orbSize,
                orbColor
            );
        }

        DrawRect(x - size / 2, y - size / 2, size, 2, Color.Black);
        DrawRect(x - size / 2, y + size / 2 - 2, size, 2, Color.Black);
        DrawRect(x - size / 2, y - size / 2, 2, size, Color.Black);
        DrawRect(x + size / 2 - 2, y - size / 2, 2, size, Color.Black);
    }

    private List<ProjectedCell> GetVisibleCells()
    {
        var result = new List<ProjectedCell>();

        int w = _graphics.PreferredBackBufferWidth;
        int h = _graphics.PreferredBackBufferHeight;

        Vector2 screenCenter = new(w / 2f, h * 0.72f);

        float alpha = MathHelper.Clamp(_tickTimer / _tickInterval, 0f, 1f);

        float interpRow = MathHelper.Lerp(_player.PreviousRow, _player.Row, alpha);
        float interpCol = MathHelper.Lerp(_player.PreviousCol, _player.Col, alpha);

        for (int row = 0; row < _grid.Rows; row++)
        {
            for (int col = 0; col < _grid.Cols; col++)
            {
                float dRow = row - interpRow;
                float dCol = col - interpCol;

                (float localRight, float localForward) = WorldToLocalFloat(dRow, dCol, _player.Facing);

                if (localForward < -0.2f || localForward > 4.5f)
                    continue;

                if (Math.Abs(localRight) > 2.5f)
                    continue;

                float forwardT = MathHelper.Clamp(localForward / 4f, 0f, 1f);

                int size = (int)MathHelper.Lerp(150f, 40f, forwardT);

                float laneSpreadNear = 180f;
                float laneSpreadFar = 50f;
                float laneSpread = MathHelper.Lerp(laneSpreadNear, laneSpreadFar, forwardT);

                float rowStepNear = 110f;
                float rowStepFar = 55f;
                float rowStep = MathHelper.Lerp(rowStepNear, rowStepFar, forwardT);

                float x = screenCenter.X + localRight * laneSpread;
                float y = screenCenter.Y - localForward * rowStep;

                var stageCell = _grid.Cells[row, col];

                result.Add(new ProjectedCell
                {
                    WorldRow = row,
                    WorldCol = col,
                    LocalForward = localForward,
                    LocalRight = localRight,
                    ScreenPosition = new Vector2(x, y),
                    Size = size,
                    HasOrb = stageCell.HasOrb,
                    IsActivated = stageCell.IsActivated
                });
            }
        }

        result.Sort((a, b) => a.LocalForward.CompareTo(b.LocalForward));
        return result;
    }

    private void DrawPlayerMarker()
    {
        int w = _graphics.PreferredBackBufferWidth;
        int h = _graphics.PreferredBackBufferHeight;

        int x = w / 2;
        int y = (int)(h * 0.82f);

        DrawRect(x - 22, y - 22, 44, 44, new Color(180, 255, 180));
        DrawRect(x - 26, y + 28, 52, 6, Color.White);
    }

    private void DrawDebugHud()
    {
        int x = 30;
        int y = 30;

        DrawBar(x, y, _activatedCount, _grid.TotalOrbs, new Color(100, 255, 120));
        DrawBar(x, y + 30, (int)(_tickTimer * 100), (int)(_tickInterval * 100), new Color(255, 220, 90));

        DrawRect(30, 100, 12, 12, Color.White);
        DrawRect(50 + _player.Col * 18, 100, 12, 12, new Color(80, 150, 255));

        int dirX = 30;
        int dirY = 130;
        for (int i = 0; i < 4; i++)
        {
            Color c = i == (int)_player.Facing ? Color.White : new Color(90, 90, 90);
            DrawRect(dirX + i * 20, dirY, 14, 14, c);
        }
    }

    private void DrawBar(int x, int y, int value, int maxValue, Color color)
    {
        DrawRect(x, y, 220, 16, new Color(40, 40, 40));
        int fill = maxValue > 0 ? (int)(220f * value / maxValue) : 0;
        DrawRect(x, y, fill, 16, color);
    }

    private static (float localRight, float localForward) WorldToLocalFloat(float dRow, float dCol, Direction facing)
    {
        return facing switch
        {
            Direction.North => (dCol, -dRow),
            Direction.East  => (dRow, dCol),
            Direction.South => (-dCol, dRow),
            Direction.West  => (-dRow, -dCol),
            _ => (dCol, -dRow)
        };
    }

    private static Point DirectionToDelta(Direction facing)
    {
        return facing switch
        {
            Direction.North => new Point(0, -1),
            Direction.East  => new Point(1, 0),
            Direction.South => new Point(0, 1),
            Direction.West  => new Point(-1, 0),
            _ => Point.Zero
        };
    }

    private static Direction TurnLeft(Direction facing)
    {
        return facing switch
        {
            Direction.North => Direction.West,
            Direction.West  => Direction.South,
            Direction.South => Direction.East,
            Direction.East  => Direction.North,
            _ => facing
        };
    }

    private static Direction TurnRight(Direction facing)
    {
        return facing switch
        {
            Direction.North => Direction.East,
            Direction.East  => Direction.South,
            Direction.South => Direction.West,
            Direction.West  => Direction.North,
            _ => facing
        };
    }

    private bool IsKeyPressed(KeyboardState current, Keys key)
    {
        return current.IsKeyDown(key) && !_previousKeyboard.IsKeyDown(key);
    }

    private void DrawRect(int x, int y, int width, int height, Color color)
    {
        _spriteBatch.Draw(_pixel, new Rectangle(x, y, width, height), color);
    }
}

public enum Direction
{
    North = 0,
    East = 1,
    South = 2,
    West = 3
}

public class PlayerState
{
    public int Row { get; set; }
    public int Col { get; set; }
    public int PreviousRow { get; set; }
    public int PreviousCol { get; set; }
    public Direction Facing { get; set; }
}

public class Cell
{
    public bool HasOrb { get; set; }
    public bool IsActivated { get; set; }
}

public class StageGrid
{
    public int Rows { get; }
    public int Cols { get; }
    public Cell[,] Cells { get; }
    public int TotalOrbs { get; private set; }

    public StageGrid(int rows, int cols)
    {
        Rows = rows;
        Cols = cols;
        Cells = new Cell[rows, cols];

        for (int r = 0; r < rows; r++)
        {
            for (int c = 0; c < cols; c++)
            {
                Cells[r, c] = new Cell();
            }
        }
    }

    public bool IsInside(int row, int col)
    {
        return row >= 0 && row < Rows && col >= 0 && col < Cols;
    }

    public static StageGrid CreateTestGrid5x5()
    {
        var grid = new StageGrid(5, 5);

        int[,] orbPositions =
        {
            { 0, 1 }, { 0, 3 },
            { 1, 0 }, { 1, 2 }, { 1, 4 },
            { 2, 1 }, { 2, 3 },
            { 3, 0 }, { 3, 2 }, { 3, 4 },
            { 4, 1 }, { 4, 3 }
        };

        for (int i = 0; i < orbPositions.GetLength(0); i++)
        {
            int r = orbPositions[i, 0];
            int c = orbPositions[i, 1];
            grid.Cells[r, c].HasOrb = true;
            grid.TotalOrbs++;
        }

        return grid;
    }
}

public class ProjectedCell
{
    public int WorldRow { get; set; }
    public int WorldCol { get; set; }
    public float LocalForward { get; set; }
    public float LocalRight { get; set; }
    public Vector2 ScreenPosition { get; set; }
    public int Size { get; set; }
    public bool HasOrb { get; set; }
    public bool IsActivated { get; set; }
}