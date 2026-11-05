package fire

import (
	"context"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	iconSize        = 256
	iconLookups     = 4
	iconCacheLength = time.Hour
)

type cachedIcon struct {
	url     string
	expires time.Time
}

// AppIcons maps the apps the key can read to their icons. App Store Connect has no
// app-level icon, so each comes from the app's newest build that carries one. Apps with
// no such build are left out, and a failed lookup only costs that app its icon.
func (c *Call) AppIcons(ctx context.Context) (map[string]string, error) {
	apps, err := c.Apps(ctx)
	if err != nil {
		return nil, err
	}
	icons := make(map[string]string, len(apps))
	var mu sync.Mutex
	var wg sync.WaitGroup
	slots := make(chan struct{}, iconLookups)
	for _, app := range apps {
		wg.Add(1)
		go func(id string) {
			defer wg.Done()
			slots <- struct{}{}
			defer func() { <-slots }()
			if url, err := c.appIcon(ctx, id); err == nil && url != "" {
				mu.Lock()
				icons[id] = url
				mu.Unlock()
			}
		}(app.ID)
	}
	wg.Wait()
	return icons, nil
}

// appIcon is only reached for apps the caller's key listed, so sharing the cache
// between keys reveals nothing. Apps without an icon are cached too.
func (c *Call) appIcon(ctx context.Context, appID string) (string, error) {
	if cached, ok := c.icons.Load(appID); ok && time.Now().Before(cached.(cachedIcon).expires) {
		return cached.(cachedIcon).url, nil
	}
	// Builds still processing have no icon yet, so look a little past the newest.
	builds, _, err := c.all(ctx, "/v1/builds", q("filter[app]", appID, "sort", "-uploadedDate", "limit", "5", "fields[builds]", "iconAssetToken"), 5)
	if err != nil {
		return "", err
	}
	url := ""
	for i := range builds {
		var asset struct {
			TemplateURL string `json:"templateUrl"`
		}
		builds[i].Decode("iconAssetToken", &asset)
		if asset.TemplateURL != "" {
			size := strconv.Itoa(iconSize)
			url = strings.NewReplacer("{w}", size, "{h}", size, "{f}", "png").Replace(asset.TemplateURL)
			break
		}
	}
	c.icons.Store(appID, cachedIcon{url: url, expires: time.Now().Add(iconCacheLength)})
	return url, nil
}
