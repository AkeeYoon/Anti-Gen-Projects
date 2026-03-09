package services

import (
	"encoding/hex"
	"errors"
	"net"
	"strings"
)

// WakeOnLAN sends a magic packet to the given MAC address to wake up a PC.
func WakeOnLAN(macAddr string) error {
	// Clean the MAC address (remove colons or dashes)
	cleanMAC := strings.ReplaceAll(macAddr, ":", "")
	cleanMAC = strings.ReplaceAll(cleanMAC, "-", "")

	if len(cleanMAC) != 12 {
		return errors.New("invalid MAC address length")
	}

	macBytes, err := hex.DecodeString(cleanMAC)
	if err != nil {
		return err
	}

	// Create the magic packet: 6 bytes of 0xFF followed by 16 repetitions of the MAC address
	var magicPacket []byte
	for i := 0; i < 6; i++ {
		magicPacket = append(magicPacket, 0xFF)
	}
	for i := 0; i < 16; i++ {
		magicPacket = append(magicPacket, macBytes...)
	}

	// Send UDP packet to broadcast address
	// In MVP, we use 255.255.255.255. Ideally fetched from settings.
	bcastAddr, err := net.ResolveUDPAddr("udp", "255.255.255.255:9")
	if err != nil {
		return err
	}

	conn, err := net.DialUDP("udp", nil, bcastAddr)
	if err != nil {
		return err
	}
	defer conn.Close()

	_, err = conn.Write(magicPacket)
	return err
}
