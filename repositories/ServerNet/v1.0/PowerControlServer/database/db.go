package database

import (
	"database/sql"
	"log"
	"os"

	_ "modernc.org/sqlite"
)

type Device struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Type string `json:"type"`
	Room string `json:"room"`
	IP   string `json:"ip"`
	MAC  string `json:"mac"`
	IsOn bool   `json:"isOn"`
}

type Schedule struct {
	Room           string `json:"room"`
	Name           string `json:"name"`
	IsActive       bool   `json:"isActive"`
	StartTime      string `json:"startTime"`
	EndTime        string `json:"endTime"`
	ProjectorDelay int    `json:"projectorDelay"`
	PcDelay        int    `json:"pcDelay"`
}

var DB *sql.DB

func InitDB() {
	// Ensure directory exists
	os.MkdirAll("./data", os.ModePerm)

	var err error
	DB, err = sql.Open("sqlite", "./data/powerctrl.db")
	if err != nil {
		log.Fatal("Failed to open database:", err)
	}

	createTables()
	DB.Exec(`ALTER TABLE schedules ADD COLUMN name TEXT DEFAULT ''`)
	seedData()
}

func createTables() {
	query1 := `
	CREATE TABLE IF NOT EXISTS devices (
		id TEXT PRIMARY KEY,
		name TEXT,
		type TEXT,
		room TEXT,
		ip TEXT,
		mac TEXT,
		is_on BOOLEAN
	);`
	_, err := DB.Exec(query1)
	if err != nil {
		log.Fatal("Failed to create devices table:", err)
	}

	query2 := `
	CREATE TABLE IF NOT EXISTS schedules (
		room TEXT PRIMARY KEY,
		name TEXT,
		is_active BOOLEAN,
		start_time TEXT,
		end_time TEXT,
		projector_delay INTEGER,
		pc_delay INTEGER
	);`
	_, err = DB.Exec(query2)
	if err != nil {
		log.Fatal("Failed to create schedules table:", err)
	}
}

func seedData() {
	// Optional: Patch older DB records where name is empty
	DB.Exec(`UPDATE schedules SET name='1 강의실' WHERE room='room1' AND name=''`)
	DB.Exec(`UPDATE schedules SET name='대회의실' WHERE room='room2' AND name=''`)

	// Check if already seeded
	var count int
	DB.QueryRow("SELECT COUNT(*) FROM devices").Scan(&count)
	if count > 0 {
		return // Data exists
	}

	devices := []Device{
		{ID: "pc101", Name: "강원-PC-01", Type: "pc", Room: "room1", IP: "192.168.1.101", MAC: "AA:BB:CC:DD:EE:01", IsOn: true},
		{ID: "pc102", Name: "강원-PC-02", Type: "pc", Room: "room1", IP: "192.168.1.102", MAC: "AA:BB:CC:DD:EE:02", IsOn: true},
		{ID: "pc103", Name: "강원-PC-03", Type: "pc", Room: "room1", IP: "192.168.1.103", MAC: "AA:BB:CC:DD:EE:03", IsOn: false},
		{ID: "pj101", Name: "전면 프로젝터", Type: "projector", Room: "room1", IP: "192.168.1.50", MAC: "AA:BB:CC:DD:FF:01", IsOn: false},

		{ID: "pc201", Name: "발표자 PC", Type: "pc", Room: "room2", IP: "192.168.2.10", MAC: "AA:BB:CC:DD:EE:10", IsOn: false},
		{ID: "pj201", Name: "메인 레이저 프로젝터", Type: "projector", Room: "room2", IP: "192.168.2.50", MAC: "AA:BB:CC:DD:FF:10", IsOn: true},
		{ID: "pj202", Name: "서브 프로젝터 (좌)", Type: "projector", Room: "room2", IP: "192.168.2.51", MAC: "AA:BB:CC:DD:FF:11", IsOn: true},
		{ID: "pj203", Name: "서브 프로젝터 (우)", Type: "projector", Room: "room2", IP: "192.168.2.52", MAC: "AA:BB:CC:DD:FF:12", IsOn: false},
	}

	for _, d := range devices {
		_, err := DB.Exec(`INSERT INTO devices (id, name, type, room, ip, mac, is_on) VALUES (?, ?, ?, ?, ?, ?, ?)`,
			d.ID, d.Name, d.Type, d.Room, d.IP, d.MAC, d.IsOn)
		if err != nil {
			log.Printf("Failed to seed device %s: %v\n", d.ID, err)
		}
	}

	// Seed Schedules
	schedules := []Schedule{
		{Room: "room1", IsActive: false, StartTime: "08:30", EndTime: "18:00", ProjectorDelay: 5, PcDelay: 5},
		{Room: "room2", IsActive: false, StartTime: "09:50", EndTime: "12:00", ProjectorDelay: 3, PcDelay: 3},
	}
	for _, s := range schedules {
		DB.Exec(`INSERT INTO schedules (room, is_active, start_time, end_time, projector_delay, pc_delay) 
			VALUES (?, ?, ?, ?, ?, ?)`, s.Room, s.IsActive, s.StartTime, s.EndTime, s.ProjectorDelay, s.PcDelay)
	}
}

func GetAllDevices() ([]Device, error) {
	rows, err := DB.Query("SELECT id, name, type, room, ip, mac, is_on FROM devices")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var devices []Device
	for rows.Next() {
		var d Device
		err := rows.Scan(&d.ID, &d.Name, &d.Type, &d.Room, &d.IP, &d.MAC, &d.IsOn)
		if err != nil {
			return nil, err
		}
		devices = append(devices, d)
	}

	return devices, nil
}

func GetDeviceByID(id string) (Device, error) {
	var d Device
	err := DB.QueryRow("SELECT id, name, type, room, ip, mac, is_on FROM devices WHERE id = ?", id).
		Scan(&d.ID, &d.Name, &d.Type, &d.Room, &d.IP, &d.MAC, &d.IsOn)
	return d, err
}

func ToggleDevicePower(id string, isOn bool) error {
	_, err := DB.Exec("UPDATE devices SET is_on = ? WHERE id = ?", isOn, id)
	return err
}

func ToggleGroupPower(groupType string, groupValue string, isOn bool) error {
	query := "UPDATE devices SET is_on = ? WHERE room = ?"
	if groupType == "type" {
		query = "UPDATE devices SET is_on = ? WHERE type = ?"
	}
	_, err := DB.Exec(query, isOn, groupValue)
	return err
}

func ToggleAllPower(isOn bool) error {
	_, err := DB.Exec("UPDATE devices SET is_on = ?", isOn)
	return err
}

func AddDevice(d Device) error {
	_, err := DB.Exec(`INSERT INTO devices (id, name, type, room, ip, mac, is_on) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		d.ID, d.Name, d.Type, d.Room, d.IP, d.MAC, d.IsOn)
	return err
}

func UpdateDevice(d Device) error {
	_, err := DB.Exec(`UPDATE devices SET name=?, type=?, room=?, ip=?, mac=? WHERE id=?`,
		d.Name, d.Type, d.Room, d.IP, d.MAC, d.ID)
	return err
}

func DeleteDevice(id string) error {
	_, err := DB.Exec(`DELETE FROM devices WHERE id=?`, id)
	return err
}

func DeleteDevicesByType(deviceType string) error {
	_, err := DB.Exec(`DELETE FROM devices WHERE type=?`, deviceType)
	return err
}

// --- Schedule Operations ---

func GetAllSchedules() ([]Schedule, error) {
	rows, err := DB.Query("SELECT room, name, is_active, start_time, end_time, projector_delay, pc_delay FROM schedules")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schedules []Schedule
	for rows.Next() {
		var s Schedule
		err := rows.Scan(&s.Room, &s.Name, &s.IsActive, &s.StartTime, &s.EndTime, &s.ProjectorDelay, &s.PcDelay)
		if err != nil {
			return nil, err
		}
		schedules = append(schedules, s)
	}
	return schedules, nil
}

func UpdateSchedule(s Schedule) error {
	_, err := DB.Exec(`INSERT INTO schedules (room, name, is_active, start_time, end_time, projector_delay, pc_delay) 
		VALUES (?, ?, ?, ?, ?, ?, ?) 
		ON CONFLICT(room) DO UPDATE SET 
		name=excluded.name,
		is_active=excluded.is_active, 
		start_time=excluded.start_time, 
		end_time=excluded.end_time, 
		projector_delay=excluded.projector_delay, 
		pc_delay=excluded.pc_delay`,
		s.Room, s.Name, s.IsActive, s.StartTime, s.EndTime, s.ProjectorDelay, s.PcDelay)
	return err
}

func DeleteSchedule(room string) error {
	_, err := DB.Exec(`DELETE FROM schedules WHERE room=?`, room)
	return err
}
