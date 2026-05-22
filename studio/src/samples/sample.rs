//! Demo Rust module — exercises a range of syntax for theme testing.
//!
//! Covers: traits, generics, async, lifetimes, macros, attributes, enums,
//! pattern matching, closures, and error handling.

use std::collections::HashMap;
use std::fmt::{self, Display};
use std::sync::Arc;

const PI: f64 = 3.14159;
const HEX: u32 = 0xff_a4_30;
const BIG: u64 = 1_000_000;

#[derive(Debug, Clone, PartialEq)]
pub enum Role {
    Admin,
    User,
    Guest,
}

#[derive(Debug, Clone)]
pub struct User<'a, T> {
    pub id: &'a str,
    pub name: String,
    pub role: Role,
    pub metadata: Option<T>,
}

impl<'a, T: Clone> User<'a, T> {
    /// Construct a fresh user with default metadata.
    pub fn new(id: &'a str, name: impl Into<String>) -> Self {
        Self { id, name: name.into(), role: Role::User, metadata: None }
    }

    pub fn with_role(mut self, role: Role) -> Self {
        self.role = role;
        self
    }
}

impl<'a, T> Display for User<'a, T> {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "User<{}>({:?})", self.id, self.role)
    }
}

pub trait Greeter {
    fn greet(&self, salutation: &str) -> String;
}

impl<'a, T> Greeter for User<'a, T> {
    fn greet(&self, salutation: &str) -> String {
        format!("{}, {}!", salutation, self.name)
    }
}

#[derive(thiserror::Error, Debug)]
pub enum FetchError {
    #[error("empty id")]
    EmptyId,
    #[error("network: {0}")]
    Network(String),
}

pub async fn fetch_user(id: &str) -> Result<Arc<User<'_, HashMap<String, i32>>>, FetchError> {
    if id.is_empty() {
        return Err(FetchError::EmptyId);
    }
    let mut meta = HashMap::new();
    meta.insert("hits".to_string(), 0);
    Ok(Arc::new(User::new(id, format!("user-{id}")).with_role(Role::Admin)))
}

fn categorize(role: &Role) -> &'static str {
    match role {
        Role::Admin => "elevated",
        Role::User | Role::Guest => "limited",
    }
}

fn main() {
    let users: Vec<_> = (0..5)
        .map(|i| User::new("u", format!("user-{i}")).with_role(Role::User))
        .collect();

    for u in &users {
        println!("{} → {}", u.greet("Hey"), categorize(&u.role));
    }

    let total: i32 = (1..=10).filter(|n| n % 2 == 0).sum();
    assert_eq!(total, 30);
}
