from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
)

from sqlalchemy.orm import relationship

from db import Base


# =========================================================
# MINES
# =========================================================

class Mine(Base):
    __tablename__ = "mines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False, unique=True)
    state = Column(String(100), nullable=False)
    district = Column(String(100))
    status = Column(String(50), default="Active")

    sectors = relationship(
        "Sector",
        back_populates="mine",
        cascade="all, delete-orphan"
    )


# =========================================================
# SECTORS
# =========================================================

class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True, index=True)
    mine_id = Column(Integer, ForeignKey("mines.id"), nullable=False)
    name = Column(String(100), nullable=False)

    mine = relationship("Mine", back_populates="sectors")

    sensors = relationship(
        "Sensor",
        back_populates="sector",
        cascade="all, delete-orphan"
    )


# =========================================================
# SENSORS
# =========================================================

class Sensor(Base):
    __tablename__ = "sensors"

    id = Column(Integer, primary_key=True, index=True)
    sector_id = Column(Integer, ForeignKey("sectors.id"), nullable=False)

    sensor_code = Column(String(100), nullable=False, unique=True)
    parameter = Column(String(100), nullable=False)
    unit = Column(String(30))
    status = Column(String(50), default="Active")

    sector = relationship("Sector", back_populates="sensors")

    readings = relationship(
        "SensorReading",
        back_populates="sensor",
        cascade="all, delete-orphan"
    )


# =========================================================
# SENSOR READINGS
# =========================================================

class SensorReading(Base):
    __tablename__ = "sensor_readings"

    id = Column(Integer, primary_key=True, index=True)

    sensor_id = Column(
        Integer,
        ForeignKey("sensors.id"),
        nullable=False
    )

    value = Column(Float, nullable=False)
    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    data_quality = Column(String(50), default="Valid")

    sensor = relationship(
        "Sensor",
        back_populates="readings"
    )


# =========================================================
# RISK ASSESSMENTS
# =========================================================

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)

    mine_id = Column(
        Integer,
        ForeignKey("mines.id"),
        nullable=False
    )

    sector_id = Column(
        Integer,
        ForeignKey("sectors.id")
    )

    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(30), nullable=False)

    reason = Column(Text)

    assessed_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# =========================================================
# COMPLIANCE RECORDS
# =========================================================

class ComplianceRecord(Base):
    __tablename__ = "compliance_records"

    id = Column(Integer, primary_key=True, index=True)

    mine_id = Column(
        Integer,
        ForeignKey("mines.id"),
        nullable=False
    )

    sector_id = Column(
        Integer,
        ForeignKey("sectors.id")
    )

    requirement = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)

    due_date = Column(DateTime)
    evidence = Column(Text)

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# =========================================================
# INSPECTIONS
# =========================================================

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)

    mine_id = Column(
        Integer,
        ForeignKey("mines.id"),
        nullable=False
    )

    sector_id = Column(
        Integer,
        ForeignKey("sectors.id")
    )

    inspection_type = Column(String(150), nullable=False)
    status = Column(String(50), default="Pending")

    findings = Column(Text)

    inspection_date = Column(DateTime)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# =========================================================
# FIELD ACTIVITIES
# =========================================================

class FieldActivity(Base):
    __tablename__ = "field_activities"

    id = Column(Integer, primary_key=True, index=True)

    mine_id = Column(
        Integer,
        ForeignKey("mines.id"),
        nullable=False
    )

    sector_id = Column(
        Integer,
        ForeignKey("sectors.id")
    )

    activity_type = Column(String(150), nullable=False)

    description = Column(Text)

    performed_by = Column(String(150))

    status = Column(String(50), default="Pending")

    recorded_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# =========================================================
# ALERTS
# =========================================================

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    mine_id = Column(
        Integer,
        ForeignKey("mines.id"),
        nullable=False
    )

    sector_id = Column(
        Integer,
        ForeignKey("sectors.id")
    )

    alert_type = Column(String(100), nullable=False)

    severity = Column(String(30), nullable=False)

    message = Column(Text, nullable=False)

    acknowledged = Column(
        Boolean,
        default=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )