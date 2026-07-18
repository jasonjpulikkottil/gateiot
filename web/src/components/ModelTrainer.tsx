'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { SwipeLog, Employee } from '@/lib/types';

interface ModelTrainerProps {
  employees: Employee[];
  logs: SwipeLog[];
}

interface TrainingMetrics {
  loss: number;
  mse: number;
  epochs: number;
  sampleCount: number;
}

interface ChartPoint {
  date: string;
  actual: number;
  predicted: number | null;
  target: number;
}

export default function ModelTrainer({ employees, logs }: ModelTrainerProps) {
  const [status, setStatus] = useState<'idle' | 'training' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [metrics, setMetrics] = useState<TrainingMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);

  // Selected employee for analytics
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  // Loaded TF.js model reference
  const [tfModel, setTfModel] = useState<any>(null);

  // Group logs into complete entry/exit pairs per day per employee
  const buildDataset = useCallback(() => {
    const dailyRecords: Record<string, { entry?: SwipeLog; exit?: SwipeLog }> = {};

    for (const log of logs) {
      if (!log.granted || !log.employee_id) continue;
      const dateStr = log.swiped_at.split('T')[0];
      const recordKey = `${log.employee_id}_${dateStr}`;

      if (!dailyRecords[recordKey]) {
        dailyRecords[recordKey] = {};
      }

      if (log.swipe_type === 'entry') {
        const current = dailyRecords[recordKey].entry;
        if (!current || new Date(log.swiped_at) < new Date(current.swiped_at)) {
          dailyRecords[recordKey].entry = log;
        }
      } else if (log.swipe_type === 'exit') {
        const current = dailyRecords[recordKey].exit;
        if (!current || new Date(log.swiped_at) > new Date(current.swiped_at)) {
          dailyRecords[recordKey].exit = log;
        }
      }
    }

    const xs: number[][] = [];
    const ys: number[] = [];
    const rawSamples: Array<{
      employee_id: string;
      date: string;
      entryTime: number;
      exitTime: number;
      weekday: number;
      entryTemp: number;
      entryHum: number;
      exitTemp: number;
      exitHum: number;
      hours: number;
    }> = [];

    for (const [key, record] of Object.entries(dailyRecords)) {
      const [empId, dateStr] = key.split('_');
      if (record.entry && record.exit) {
        const entryTime = new Date(record.entry.swiped_at);
        const exitTime = new Date(record.exit.swiped_at);

        const entryMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();
        const exitMinutes = exitTime.getHours() * 60 + exitTime.getMinutes();
        const weekday = entryTime.getDay();

        const diffMs = exitTime.getTime() - entryTime.getTime();
        const hours = Math.max(0, diffMs / 3600000); // convert to decimal hours

        const entryTemp = record.entry.temperature || 25;
        const entryHum = record.entry.humidity || 50;
        const exitTemp = record.exit.temperature || 25;
        const exitHum = record.exit.humidity || 50;

        xs.push([
          entryMinutes / 1440,
          exitMinutes / 1440,
          weekday / 6.0,
          (entryTemp - 15) / 30,
          entryHum / 100,
          (exitTemp - 15) / 30,
          exitHum / 100
        ]);

        ys.push(hours / 24.0); // Predict hours normalized between 0 and 1

        rawSamples.push({
          employee_id: empId,
          date: dateStr,
          entryTime: entryMinutes,
          exitTime: exitMinutes,
          weekday,
          entryTemp,
          entryHum,
          exitTemp,
          exitHum,
          hours
        });
      }
    }

    return { xs, ys, rawSamples, count: xs.length };
  }, [logs]);

  // Set default selected employee on mount
  useEffect(() => {
    if (employees.length > 0 && !selectedEmpId) {
      setSelectedEmpId(employees[0].id);
    }
  }, [employees, selectedEmpId]);

  // Update chart data whenever logs, selected employee, or the trained model changes
  useEffect(() => {
    const dataset = buildDataset();
    if (!dataset || !selectedEmpId) {
      setChartData([]);
      return;
    }

    const { rawSamples } = dataset;
    const empSamples = rawSamples
      .filter((s) => s.employee_id === selectedEmpId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const points: ChartPoint[] = empSamples.map((s) => {
      let predictedHours = null;

      // Predict if TF model is loaded and trained
      if (tfModel) {
        try {
          const inputTensor = tfModel.tensor2d([[
            s.entryTime / 1440,
            s.exitTime / 1440,
            s.weekday / 6.0,
            (s.entryTemp - 15) / 30,
            s.entryHum / 100,
            (s.exitTemp - 15) / 30,
            s.exitHum / 100
          ]]);
          const prediction = tfModel.predict(inputTensor);
          predictedHours = prediction.dataSync()[0] * 24.0;
          inputTensor.dispose();
          prediction.dispose();
        } catch (e) {
          console.error('Prediction error', e);
        }
      }

      return {
        date: s.date,
        actual: parseFloat(s.hours.toFixed(2)),
        predicted: predictedHours != null ? parseFloat(predictedHours.toFixed(2)) : null,
        target: 8.0 // default target productive hours
      };
    });

    setChartData(points);
  }, [logs, selectedEmpId, tfModel, buildDataset]);

  const trainModel = useCallback(async () => {
    setStatus('training');
    setProgress(0);
    setError(null);
    setMetrics(null);

    try {
      const tf = await import('@tensorflow/tfjs');

      const dataset = buildDataset();
      if (!dataset || dataset.count < 3) {
        setError('Need at least 3 completed employee workdays (with both Entry and Exit swipes) to train.');
        setStatus('error');
        return;
      }

      const { xs, ys, count } = dataset;

      const xsTensor = tf.tensor2d(xs);
      const ysTensor = tf.tensor1d(ys);

      // 3-Layer dense neural network for regression
      const model = tf.sequential({
        layers: [
          tf.layers.dense({ inputShape: [7], units: 16, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.1 }),
          tf.layers.dense({ units: 8, activation: 'relu' }),
          tf.layers.dense({ units: 1, activation: 'sigmoid' }), // outputs predicted productive hours (0-1)
        ],
      });

      model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError',
        metrics: ['mse'],
      });

      const EPOCHS = 40;
      let lastLoss = 0;
      let lastMse = 0;

      await model.fit(xsTensor, ysTensor, {
        epochs: EPOCHS,
        batchSize: Math.min(8, count),
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            setProgress(Math.round(((epoch + 1) / EPOCHS) * 100));
            lastLoss = logs?.loss ?? 0;
            lastMse  = logs?.mse ?? 0;
          },
        },
      });

      xsTensor.dispose();
      ysTensor.dispose();

      // Store model and trigger chart update
      setTfModel(tf);
      
      const trainingMetrics: TrainingMetrics = {
        loss: parseFloat(lastLoss.toFixed(5)),
        mse: parseFloat(lastMse.toFixed(5)),
        epochs: EPOCHS,
        sampleCount: count,
      };

      setMetrics(trainingMetrics);
      setStatus('done');

      // Auto-save weights to DB
      const saved = await model.save(tf.io.withSaveHandler(async (artifacts) => {
        return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' }, ...artifacts };
      }));
      void saved;
      
      const weightData = (model.toJSON() as object);
      await saveWeights(weightData, trainingMetrics);

    } catch (err) {
      console.error(err);
      setError('Training failed: ' + String(err));
      setStatus('error');
    }
  }, [buildDataset]);

  const saveWeights = async (weights: object, trainingMetrics: TrainingMetrics) => {
    setSaving(true);
    try {
      const res = await fetch('/api/model/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weights,
          metrics: trainingMetrics,
          trained_by: 'HR Dashboard (browser)',
        }),
      });
      const json = await res.json();
      if (json.data?.version) setSavedVersion(json.data.version);
    } catch {
      setError('Model trained but failed to save weights to cloud.');
    } finally {
      setSaving(false);
    }
  };

  const sampleCount = buildDataset()?.count ?? 0;

  return (
    <div className="grid-2" style={{ gap: '24px', alignItems: 'start' }}>
      
      {/* ── LEFT PANEL: TRAINING CONSOLE ────────────────────────── */}
      <div className="card card--accent" style={{ height: '100%' }}>
        <div className="section-title" style={{ marginBottom: 16 }}>
          <span>🧠</span> Continuous ML Trainer
          <span className="section-title__sub">{sampleCount} completed days available</span>
        </div>

        <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: 20, lineHeight: 1.7 }}>
          Trains a 3-layer neural network using **TensorFlow.js** directly inside your browser. 
          The model accepts entry time, exit time, weekday, and local climate telemetry to predict employee daily productive hours. 
        </p>

        {/* Progress bar */}
        {status === 'training' && (
          <div style={{ marginBottom: 20 }}>
            <div className="flex justify-between" style={{ marginBottom: 8 }}>
              <span className="text-secondary" style={{ fontSize: '0.8rem' }}>Training epochs...</span>
              <span className="text-accent" style={{ fontSize: '0.8rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Metrics Grid */}
        {metrics && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 12,
              marginBottom: 20,
              padding: 16,
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}
          >
            {[
              { label: 'Loss',     value: metrics.loss },
              { label: 'MSE',      value: metrics.mse },
              { label: 'Epochs',   value: metrics.epochs },
              { label: 'Samples',  value: metrics.sampleCount },
            ].map((m) => (
              <div key={m.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
                <div className="stat-card__label" style={{ fontSize: '0.65rem', marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Cloud version save badge */}
        {savedVersion && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--green-soft)',
              border: '1px solid rgba(34,211,165,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--green)',
              fontSize: '0.83rem',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            ✓ Policy Model saved to Supabase (v{savedVersion})
          </div>
        )}

        {/* Error Callout */}
        {error && (
          <div
            style={{
              padding: '10px 14px',
              background: 'var(--red-soft)',
              border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--red)',
              fontSize: '0.83rem',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="btn btn--primary"
            onClick={trainModel}
            disabled={status === 'training' || saving || sampleCount < 3}
          >
            {status === 'training' ? '⏳ Training...' : saving ? '☁ Saving...' : '▶ Train Model'}
          </button>
          {status === 'done' && (
            <button className="btn btn--ghost" onClick={() => { setStatus('idle'); setMetrics(null); setSavedVersion(null); }}>
              Reset
            </button>
          )}
        </div>

        {sampleCount < 3 && (
          <p className="text-muted" style={{ fontSize: '0.78rem', marginTop: 12 }}>
            Need at least 3 completed employee workdays (Entry + Exit swipes logged) to begin training. Keep swiping!
          </p>
        )}
      </div>

      {/* ── RIGHT PANEL: PERFORMANCE CHARTS ─────────────────────── */}
      <div className="card" style={{ height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginBottom: 20 }}>
          <div className="section-title" style={{ margin: 0 }}>
            <span>📈</span> Performance Analytics
            <span className="section-title__sub">Compare actual vs predicted hours</span>
          </div>

          {/* Employee dropdown selector */}
          <select
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            className="input"
            style={{ width: '160px', padding: '6px 10px', fontSize: '0.82rem' }}
          >
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {chartData.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                <YAxis domain={[0, 12]} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} unit="h" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={8.0} stroke="var(--red)" strokeDasharray="3 3" label={{ value: 'Target', fill: 'var(--red)', fontSize: 10, position: 'top' }} />
                
                {/* Actual hours */}
                <Bar dataKey="actual" name="Actual Productive (h)" fill="var(--accent)" opacity={0.6} radius={[3, 3, 0, 0]} />
                
                {/* Predicted hours (Only renders if model is trained) */}
                {tfModel && (
                  <Line type="monotone" dataKey="predicted" name="ML Predicted (h)" stroke="var(--amber)" strokeWidth={2.5} dot={{ r: 4, fill: 'var(--amber)' }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            
            {!tfModel && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                💡 Click "Train Model" to overlay ML productive predictions based on gateway telemetry.
              </p>
            )}
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No completed entry/exit workdays logged for this employee.
          </div>
        )}
      </div>

    </div>
  );
}
