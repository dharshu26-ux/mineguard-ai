from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from db import engine


app = FastAPI(title="MineGuard AI Backend")


# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# HOME
# ==========================================

@app.get("/")
def home():
    return {
        "message": "MineGuard AI Backend is running!"
    }


# ==========================================
# DATABASE HEALTH
# ==========================================

@app.get("/api/health")
def database_health():

    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))

    return {
        "database": "PostgreSQL",
        "status": "connected"
    }
@app.get("/api/mines")
def get_mines():
    query = text("""
        SELECT
            id,
            name,
            state,
            district,
            status
        FROM public.mines
        ORDER BY id;
    """)

    with engine.connect() as connection:
        result = connection.execute(query)
        rows = result.mappings().all()

    return {
        "mines": [dict(row) for row in rows]
    }


# ==========================================
# SENSOR READING MODEL
# ==========================================

class SensorReading(BaseModel):
    sensor_id: int
    value: float
    data_quality: str = "Good"


# ==========================================
# SENSOR DATA INGESTION
# ==========================================

@app.post("/api/sensor-readings")
def create_sensor_reading(reading: SensorReading):

    # 1. Store the new sensor reading
    insert_query = text("""
        INSERT INTO public.sensor_readings
        (sensor_id, value, recorded_at, data_quality)
        VALUES
        (:sensor_id, :value, CURRENT_TIMESTAMP, :data_quality)
        RETURNING id, sensor_id, value, recorded_at, data_quality
    """)

    with engine.begin() as connection:
        result = connection.execute(
            insert_query,
            {
                "sensor_id": reading.sensor_id,
                "value": reading.value,
                "data_quality": reading.data_quality
            }
        )
        new_reading = dict(result.mappings().one())

    # 2. Find which sector this sensor belongs to
    sector_query = text("""
        SELECT sector_id
        FROM public.sensors
        WHERE id = :sensor_id
    """)

    with engine.connect() as connection:
        result = connection.execute(
            sector_query,
            {"sensor_id": reading.sensor_id}
        )
        sector_row = result.mappings().first()

    if not sector_row:
        raise HTTPException(
            status_code=404,
            detail="Sensor not found"
        )

    sector_id = sector_row["sector_id"]

    # 3. Get latest reading from every sensor in this sector
    risk_query = text("""
        SELECT
            s.parameter,
            sr.value
        FROM public.sensors s

        LEFT JOIN LATERAL (
            SELECT value
            FROM public.sensor_readings
            WHERE sensor_id = s.id
            ORDER BY recorded_at DESC
            LIMIT 1
        ) sr ON TRUE

        WHERE s.sector_id = :sector_id;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            risk_query,
            {"sector_id": sector_id}
        )
        rows = result.mappings().all()

    # 4. Calculate current risk
    risk_score = 0
    factors = []

    for row in rows:

        value = row["value"]
        parameter = row["parameter"]

        if value is None:
            continue

        if parameter == "Oxygen" and value < 20:
            risk_score += 25
            factors.append("Oxygen reading requires attention")

        elif parameter == "Carbon Dioxide" and value > 0.10:
            risk_score += 20
            factors.append("Carbon dioxide reading requires attention")

        elif parameter == "Carbon Monoxide" and value > 10:
            risk_score += 20
            factors.append("Carbon monoxide reading requires attention")

        elif parameter == "Methane" and value > 0.6:
            risk_score += 25
            factors.append("Methane reading requires attention")

        elif parameter == "Temperature" and value >= 35:
            risk_score += 15
            factors.append("High temperature")

        elif parameter == "Airflow" and value < 60:
            risk_score += 15
            factors.append("Low airflow")

        elif parameter == "Water Level" and value >= 80:
            risk_score += 20
            factors.append("High water level")

    risk_score = min(risk_score, 100)

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "reading": new_reading,
        "sector_id": sector_id,
        "risk": {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "factors": factors
        }
    }

# ==========================================
# LATEST SENSOR READINGS
# ==========================================

@app.get("/api/realtime-gas")
def realtime_gas(mine_id: int = 1, sector_id: int = 1):

    query = text("""
        SELECT
            s.id AS sensor_id,
            s.parameter,
            s.unit,
            sr.value,
            sr.recorded_at,
            sr.data_quality,
            sec.name AS sector,
            m.name AS mine,
            m.state,
            m.district
        FROM public.sensors s

        JOIN public.sectors sec
            ON sec.id = s.sector_id

        JOIN public.mines m
            ON m.id = sec.mine_id

        LEFT JOIN LATERAL (
            SELECT
                value,
                recorded_at,
                data_quality
            FROM public.sensor_readings
            WHERE sensor_id = s.id
            ORDER BY recorded_at DESC
            LIMIT 1
        ) sr ON TRUE

        WHERE m.id = :mine_id
          AND sec.id = :sector_id

        ORDER BY s.id;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "mine_id": mine_id,
                "sector_id": sector_id
            }
        )

        rows = result.mappings().all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Mine or sector not found"
        )

    readings = {}

    for row in rows:
        readings[row["parameter"]] = {
            "sensor_id": row["sensor_id"],
            "value": row["value"],
            "unit": row["unit"],
            "recorded_at": row["recorded_at"],
            "data_quality": row["data_quality"]
        }

    return {
        "mine": rows[0]["mine"],
        "mine_id": mine_id,
        "state": rows[0]["state"],
        "district": rows[0]["district"],
        "sector": rows[0]["sector"],
        "sector_id": sector_id,
        "readings": readings
    }
@app.get("/api/risk")
def calculate_risk(mine_id: int = 1, sector_id: int = 1):

    query = text("""
    SELECT
        s.parameter,
        s.unit,
        sr.value,
        sr.recorded_at,
        sr.data_quality
    FROM public.sensors s

    JOIN public.sectors sec
        ON sec.id = s.sector_id

    JOIN public.mines m
        ON m.id = sec.mine_id

    LEFT JOIN LATERAL (
        SELECT
            value,
            recorded_at,
            data_quality
        FROM public.sensor_readings
        WHERE sensor_id = s.id
        ORDER BY recorded_at DESC
        LIMIT 1
    ) sr ON TRUE

    WHERE sec.id = :sector_id
      AND m.id = :mine_id

    ORDER BY s.id;
""")
    with engine.connect() as connection:
        result = connection.execute(
            query,
            {"sector_id": sector_id}
        )
        rows = result.mappings().all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail="No sensors found for this sector"
        )

    risk_score = 0
    factors = []

    # Configurable risk rules.
    # These are engineering placeholders until the applicable
    # mine/site standards are entered and approved.

    for row in rows:

        value = row["value"]
        parameter = row["parameter"]

        if value is None:
            continue

        if parameter == "Oxygen":
            if value < 20:
                risk_score += 25
                factors.append("Oxygen reading requires attention")

        elif parameter == "Carbon Dioxide":
            if value > 0.10:
                risk_score += 20
                factors.append("Carbon dioxide reading requires attention")

        elif parameter == "Carbon Monoxide":
            if value > 10:
                risk_score += 20
                factors.append("Carbon monoxide reading requires attention")

        elif parameter == "Methane":
            if value > 0.6:
                risk_score += 25
                factors.append("Methane reading requires attention")

        elif parameter == "Temperature":
            if value >= 35:
                risk_score += 15
                factors.append("High temperature")

        elif parameter == "Airflow":
            if value < 60:
                risk_score += 15
                factors.append("Low airflow")

        elif parameter == "Water Level":
            if value >= 80:
                risk_score += 20
                factors.append("High water level")

    risk_score = min(risk_score, 100)

    if risk_score >= 70:
        risk_level = "HIGH"
    elif risk_score >= 40:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "mine_id": mine_id,
        "sector_id": sector_id,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "factors": factors,
        "calculation_status": "CONFIGURABLE_RULE_ENGINE"
    }
from datetime import datetime
from typing import Optional

class ComplianceRecord(BaseModel):
    mine_id: int
    sector_id: int
    requirement: str
    status: str
    due_date: Optional[datetime] = None
    evidence: Optional[str] = None


@app.get("/api/compliance")
def get_compliance(
    mine_id: int = 1,
    sector_id: int = 1
):
    query = text("""
        SELECT
            cr.id,
            cr.mine_id,
            cr.sector_id,
            cr.requirement,
            cr.status,
            cr.due_date,
            cr.evidence,
            cr.updated_at,
            m.name AS mine,
            m.state,
            m.district,
            s.name AS sector
        FROM public.compliance_records cr

        JOIN public.mines m
            ON m.id = cr.mine_id

        JOIN public.sectors s
            ON s.id = cr.sector_id

        WHERE cr.mine_id = :mine_id
          AND cr.sector_id = :sector_id

        ORDER BY cr.id;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "mine_id": mine_id,
                "sector_id": sector_id
            }
        )

        rows = result.mappings().all()

    return {
        "mine_id": mine_id,
        "sector_id": sector_id,
        "count": len(rows),
        "compliance_records": [dict(row) for row in rows]
    }


@app.post("/api/compliance")
def create_compliance(record: ComplianceRecord):

    query = text("""
        INSERT INTO public.compliance_records
        (
            mine_id,
            sector_id,
            requirement,
            status,
            due_date,
            evidence,
            updated_at
        )
        VALUES
        (
            :mine_id,
            :sector_id,
            :requirement,
            :status,
            :due_date,
            :evidence,
            CURRENT_TIMESTAMP
        )
        RETURNING
            id,
            mine_id,
            sector_id,
            requirement,
            status,
            due_date,
            evidence,
            updated_at;
    """)

    with engine.begin() as connection:
        result = connection.execute(
            query,
            {
                "mine_id": record.mine_id,
                "sector_id": record.sector_id,
                "requirement": record.requirement,
                "status": record.status,
                "due_date": record.due_date,
                "evidence": record.evidence
            }
        )

        row = result.mappings().one()

    return {
        "message": "Compliance record created",
        "compliance": dict(row)
    }
@app.get("/api/compliance")
def get_compliance(mine_id: int = 1, sector_id: int = 1):

    query = text("""
        SELECT
            id,
            mine_id,
            sector_id,
            requirement,
            status,
            due_date,
            evidence,
            updated_at
        FROM public.compliance_records
        WHERE mine_id = :mine_id
          AND sector_id = :sector_id
        ORDER BY due_date ASC NULLS LAST;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "mine_id": mine_id,
                "sector_id": sector_id
            }
        )

        rows = result.mappings().all()

    return {
        "mine_id": mine_id,
        "sector_id": sector_id,
        "compliance_records": [dict(row) for row in rows]
    }
@app.get("/api/field-activities")
def get_field_activities(mine_id: int = 1, sector_id: int = 1):

    query = text("""
        SELECT
            id,
            mine_id,
            sector_id,
            activity_type,
            description,
            performed_by,
            status,
            recorded_at
        FROM public.field_activities
        WHERE mine_id = :mine_id
          AND sector_id = :sector_id
        ORDER BY recorded_at DESC;
    """)

    with engine.connect() as connection:
        result = connection.execute(
            query,
            {
                "mine_id": mine_id,
                "sector_id": sector_id
            }
        )

        rows = result.mappings().all()

    return {
        "mine_id": mine_id,
        "sector_id": sector_id,
        "count": len(rows),
        "field_activities": [dict(row) for row in rows]
    }
@app.get("/api/inspection-priority")
def inspection_priority():

    mines_query = text("""
        SELECT
            id,
            name,
            state
        FROM public.mines
        ORDER BY id;
    """)

    with engine.connect() as connection:
        mines = connection.execute(mines_query).mappings().all()

    result = []

    for mine in mines:

        compliance_query = text("""
            SELECT COUNT(*) AS count
            FROM public.compliance_records
            WHERE mine_id = :mine_id
              AND status IN ('Violation', 'Warning');
        """)

        activity_query = text("""
            SELECT COUNT(*) AS count
            FROM public.field_activities
            WHERE mine_id = :mine_id
              AND status = 'Pending';
        """)

        sector_query = text("""
            SELECT id
            FROM public.sectors
            WHERE mine_id = :mine_id
            ORDER BY id;
        """)

        with engine.connect() as connection:

            compliance_issues = connection.execute(
                compliance_query,
                {"mine_id": mine["id"]}
            ).scalar() or 0

            pending_activities = connection.execute(
                activity_query,
                {"mine_id": mine["id"]}
            ).scalar() or 0

            sectors = connection.execute(
                sector_query,
                {"mine_id": mine["id"]}
            ).mappings().all()

        # Calculate risk for each sector
        highest_risk = 0
        highest_risk_level = "LOW"
        risk_factors = []

        for sector in sectors:

            risk_query = text("""
                SELECT
                    s.parameter,
                    sr.value
                FROM public.sensors s

                JOIN public.sectors sec
                    ON sec.id = s.sector_id

                LEFT JOIN LATERAL (
                    SELECT value
                    FROM public.sensor_readings
                    WHERE sensor_id = s.id
                    ORDER BY recorded_at DESC
                    LIMIT 1
                ) sr ON TRUE

                WHERE sec.mine_id = :mine_id
                  AND sec.id = :sector_id;
            """)

            with engine.connect() as connection:
                sensor_rows = connection.execute(
                    risk_query,
                    {
                        "mine_id": mine["id"],
                        "sector_id": sector["id"]
                    }
                ).mappings().all()

            sector_risk = 0
            sector_factors = []

            for row in sensor_rows:

                value = row["value"]
                parameter = row["parameter"]

                if value is None:
                    continue

                if parameter == "Oxygen" and value < 20:
                    sector_risk += 25
                    sector_factors.append("Oxygen reading requires attention")

                elif parameter == "Carbon Dioxide" and value > 0.10:
                    sector_risk += 20
                    sector_factors.append("Carbon dioxide reading requires attention")

                elif parameter == "Carbon Monoxide" and value > 10:
                    sector_risk += 20
                    sector_factors.append("Carbon monoxide reading requires attention")

                elif parameter == "Methane" and value > 0.6:
                    sector_risk += 25
                    sector_factors.append("Methane reading requires attention")

                elif parameter == "Temperature" and value >= 35:
                    sector_risk += 15
                    sector_factors.append("High temperature")

                elif parameter == "Airflow" and value < 60:
                    sector_risk += 15
                    sector_factors.append("Low airflow")

                elif parameter == "Water Level" and value >= 80:
                    sector_risk += 20
                    sector_factors.append("High water level")

            sector_risk = min(sector_risk, 100)

            if sector_risk > highest_risk:
                highest_risk = sector_risk
                risk_factors = sector_factors

                if sector_risk >= 70:
                    highest_risk_level = "HIGH"
                elif sector_risk >= 40:
                    highest_risk_level = "MEDIUM"
                else:
                    highest_risk_level = "LOW"

        # Combine sensor risk with operational indicators
        final_risk = min(
            highest_risk
            + (compliance_issues * 10)
            + (pending_activities * 5),
            100
        )

        if final_risk >= 70:
            priority = "Urgent"
        elif final_risk >= 40:
            priority = "Medium"
        else:
            priority = "Normal"

        result.append({
            "mine_id": mine["id"],
            "mine": mine["name"],
            "state": mine["state"],
            "risk": final_risk,
            "risk_level": highest_risk_level,
            "priority": priority,
            "compliance_issues": compliance_issues,
            "pending_activities": pending_activities,
            "risk_factors": risk_factors
        })

    result.sort(
        key=lambda item: item["risk"],
        reverse=True
    )

    for index, item in enumerate(result, start=1):
        item["rank"] = index

    return {
        "inspection_priority": result
    }