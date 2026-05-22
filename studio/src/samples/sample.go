// Package demo exercises a range of Go syntax for theme testing.
package demo

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"
)

const (
	PI      = 3.14159
	BigNum  = 1_000_000
	Timeout = 5 * time.Second
)

// Role represents a user permission level.
type Role int

const (
	RoleGuest Role = iota
	RoleUser
	RoleAdmin
)

func (r Role) String() string {
	switch r {
	case RoleAdmin:
		return "admin"
	case RoleUser:
		return "user"
	default:
		return "guest"
	}
}

// User is a simple record with generic metadata.
type User[T any] struct {
	ID       string         `json:"id"`
	Name     string         `json:"name"`
	Role     Role           `json:"role"`
	Metadata map[string]T   `json:"metadata,omitempty"`
}

type Greeter interface {
	Greet(salutation string) string
}

func (u *User[T]) Greet(salutation string) string {
	return fmt.Sprintf("%s, %s!", salutation, u.Name)
}

var ErrEmptyID = errors.New("empty id")

func FetchUser(ctx context.Context, id string) (*User[int], error) {
	if id == "" {
		return nil, ErrEmptyID
	}
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(10 * time.Millisecond):
	}
	return &User[int]{
		ID:       id,
		Name:     fmt.Sprintf("user-%s", id),
		Role:     RoleAdmin,
		Metadata: map[string]int{"hits": 0},
	}, nil
}

func summarize(users []*User[int]) map[Role]int {
	counts := make(map[Role]int)
	for _, u := range users {
		counts[u.Role]++
	}
	return counts
}

func handler(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), Timeout)
	defer cancel()

	u, err := FetchUser(ctx, r.URL.Query().Get("id"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(u)
}

func main() {
	var wg sync.WaitGroup
	results := make(chan *User[int], 5)
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			u, err := FetchUser(context.Background(), fmt.Sprintf("%d", i))
			if err == nil {
				results <- u
			}
		}(i)
	}
	wg.Wait()
	close(results)

	for u := range results {
		fmt.Println(u.Greet("Hey"))
	}
}
