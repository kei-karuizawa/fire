package fire

import (
	"context"
	"sort"
	"strings"

	"fire/service/asc"
)

// User is a team member.
type User struct {
	ID             string   `json:"id"`
	Username       string   `json:"username"`
	FirstName      string   `json:"firstName"`
	LastName       string   `json:"lastName"`
	Roles          []string `json:"roles"`
	AllAppsVisible bool     `json:"allAppsVisible"`
}

// Invitation is a pending team invitation.
type Invitation struct {
	ID             string   `json:"id"`
	Email          string   `json:"email"`
	FirstName      string   `json:"firstName"`
	LastName       string   `json:"lastName"`
	Roles          []string `json:"roles"`
	AllAppsVisible bool     `json:"allAppsVisible"`
	ExpirationDate string   `json:"expirationDate"`
}

// Team is the Users and Access page document.
type Team struct {
	Users       []User       `json:"users"`
	Invitations []Invitation `json:"invitations"`
}

// Roles that an invitation may grant.
var Roles = map[string]bool{
	"ADMIN": true, "FINANCE": true, "ACCOUNT_HOLDER": false, "SALES": true, "MARKETING": true, "APP_MANAGER": true,
	"DEVELOPER": true, "ACCESS_TO_REPORTS": true, "CUSTOMER_SUPPORT": true, "CREATE_APPS": true,
	"CLOUD_MANAGED_DEVELOPER_ID": true, "CLOUD_MANAGED_APP_DISTRIBUTION": true, "GENERATE_INDIVIDUAL_KEYS": true,
}

// Team lists users and pending invitations.
func (c *Call) Team(ctx context.Context) (*Team, error) {
	t := &Team{Users: []User{}, Invitations: []Invitation{}}
	err := parallel(
		func() error {
			list, _, err := c.all(ctx, "/v1/users", q("limit", "200"), 2000)
			if err != nil {
				return err
			}
			for i := range list {
				r := &list[i]
				t.Users = append(t.Users, User{ID: r.ID, Username: r.Str("username"), FirstName: r.Str("firstName"), LastName: r.Str("lastName"), Roles: nonNil(r.StrList("roles")), AllAppsVisible: r.Bool("allAppsVisible")})
			}
			sort.SliceStable(t.Users, func(a, b int) bool {
				return strings.ToLower(t.Users[a].FirstName+t.Users[a].LastName) < strings.ToLower(t.Users[b].FirstName+t.Users[b].LastName)
			})
			return nil
		},
		func() error {
			list, _, err := c.all(ctx, "/v1/userInvitations", q("limit", "200"), 2000)
			if err != nil {
				return err
			}
			for i := range list {
				r := &list[i]
				t.Invitations = append(t.Invitations, Invitation{ID: r.ID, Email: r.Str("email"), FirstName: r.Str("firstName"), LastName: r.Str("lastName"), Roles: nonNil(r.StrList("roles")), AllAppsVisible: r.Bool("allAppsVisible"), ExpirationDate: r.Str("expirationDate")})
			}
			return nil
		},
	)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func nonNil(list []string) []string {
	if list == nil {
		return []string{}
	}
	return list
}

// InviteInput is a new team member.
type InviteInput struct {
	Email          string   `json:"email"`
	FirstName      string   `json:"firstName"`
	LastName       string   `json:"lastName"`
	Roles          []string `json:"roles"`
	AllAppsVisible bool     `json:"allAppsVisible"`
}

// Invite sends a team invitation.
func (c *Call) Invite(ctx context.Context, in InviteInput) (*Team, error) {
	in.Email, in.FirstName, in.LastName = strings.TrimSpace(in.Email), strings.TrimSpace(in.FirstName), strings.TrimSpace(in.LastName)
	if !strings.Contains(in.Email, "@") || len(in.Email) > 254 {
		return nil, asc.Errorf(400, "invalid_request", "enter a valid email address")
	}
	if in.FirstName == "" || in.LastName == "" {
		return nil, asc.Errorf(400, "invalid_request", "first and last name are required")
	}
	if len(in.Roles) == 0 {
		return nil, asc.Errorf(400, "invalid_request", "choose at least one role")
	}
	for _, role := range in.Roles {
		if !Roles[role] {
			return nil, asc.Errorf(400, "invalid_request", "role %q cannot be granted", role)
		}
	}
	if _, err := c.create(ctx, "/v1/userInvitations", "userInvitations", map[string]any{
		"email": in.Email, "firstName": in.FirstName, "lastName": in.LastName, "roles": in.Roles, "allAppsVisible": in.AllAppsVisible,
	}, nil); err != nil {
		return nil, err
	}
	return c.Team(ctx)
}

// RemoveUser removes a team member.
func (c *Call) RemoveUser(ctx context.Context, id string) (*Team, error) {
	if err := c.Client.Delete(ctx, c.Token, "/v1/users/"+id, nil); err != nil {
		return nil, err
	}
	return c.Team(ctx)
}

// CancelInvitation withdraws a pending invitation.
func (c *Call) CancelInvitation(ctx context.Context, id string) (*Team, error) {
	if err := c.Client.Delete(ctx, c.Token, "/v1/userInvitations/"+id, nil); err != nil {
		return nil, err
	}
	return c.Team(ctx)
}
